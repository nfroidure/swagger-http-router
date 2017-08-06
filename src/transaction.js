'use strict';

const { initializer } = require('knifecycle');
const HTTPError = require('yhttperror');
const statuses = require('statuses');

const DEFAULT_TIMEOUT = 30 * 1000;

function noop() {}
function createIncrementor(n = 0) {
  return function increment() { return (n++) + ''; };
}

/* Architecture Note #3: HTTP Transactions
The `httpTransaction` service create a new transaction
 for every single HTTP request incoming. It helps
 ensuring each request receives a response and avoid
 idle requests via a configurable timeout.

It is also a convenient abstraction of the actual
 request/response between the router and
 the NodeJS world. A common need is to fake the
 HTTP method for backward compatibility with old
 browsers/proxies by using the
 `X-HTTP-Method-Override` header.

You could simply do this by wrapping this service
 like so:
```js
import { initHTTPTransaction } from 'swagger-http-router';
import { wrapInitializer } from 'knifecycle/dist/util';

export const initHTTPTransactionWithMethodOverride =
  wrapInitializer(async (services, httpTransaction) => {
  return async (...args) => {
    const [request, transaction] = httpTransaction(...args);

    return [{
      ...request,
      method: request.headers['x-http-method-override'] ?
        request.headers['x-http-method-override'].toLowerCase() :
        request.method,
      headers: Object.keys(req.headers)
        .filter(
          headerName =>
          'x-http-method-override' === headerName
        )
        .reduce((newHeaders, headerName) => {}, {
          newHeaders[headerName] = req.headers[headerName];
          return newHeaders;
        })
    }, httpTransaction];
  };
}, initHTTPTransaction);
```
*/

module.exports = initializer({
  name: 'httpTransaction',
  type: 'service',
  inject: [
    '?TIMEOUT', '?TRANSACTIONS',
    'log', 'time', 'delay', '?uniqueId',
  ],
}, initHTTPTransaction);

/**
 * Instantiate the httpTransaction service
 * @param  {Object}     services
 * The services to inject
 * @param  {Number}     [services.TIMEOUT=30000]
 * A number indicating how many ms the transaction
 *  should take to complete before being cancelled.
 * @param  {Object}     [services.TRANSACTIONS={}]
 * A hash of every current transactions
 * @param  {Function}   services.time
 * A timing function
 * @param  {Object}     services.delay
 * A delaying service
 * @param  {Function}   [services.log]
 * A logging function
 * @param  {Function}   [services.uniqueId]
 * A function returning unique identifiers
 * @return {Promise<Function>}
 * A promise of the httpTransaction function
 * @example
 * import { initHTTPTransaction } from 'swagger-http-router';
 *
 * const httpTransaction = await initHTTPTransaction({
 *   log: console.log.bind(console),
 *   time: Date.now.bind(Date),
 * });
 */
function initHTTPTransaction({
  TIMEOUT = DEFAULT_TIMEOUT,
  TRANSACTIONS = {},
  log = noop, time, delay,
  uniqueId = createIncrementor(),
}) {
  log('debug', 'HTTP Transaction initialized.');
  return Promise.resolve(httpTransaction);

  /**
   * Create a new HTTP transaction
   * @param  {HTTPRequest}  req
   * A raw NodeJS HTTP incoming message
   * @param  {HTTPResponse} res
   * A raw NodeJS HTTP response
   * @return {Array}
   * The normalized request and the HTTP
   * transaction created in an array.
   */
  function httpTransaction(req, res) {
    let initializationPromise;

    /* Architecture Note #3.1: New Transaction
    The idea is to maintain a hash of each pending
     transaction. To do so, we create a transaction
     object that contains useful informations about
     the transaction and we store it into the
     `TRANSACTIONS` hash.

    Each transaction has a unique id that is either
     generated or picked up in the `Transaction-Id`
     request header. This allows to trace
     transactions end to end with that unique id.
    */
    return Promise.resolve()
    .then(() => {
      const request = {
        url: req.url,
        method: req.method.toLowerCase(),
        headers: req.headers,
        body: req,
      };
      const transaction = {
        protocol: req.connection.encrypted ? 'https' : 'http',
        ip: (req.headers['x-forwarded-for'] || '').split(',')[0] ||
          req.connection.remoteAddress,
        startInBytes: req.socket.bytesRead,
        startOutBytes: req.socket.bytesWritten,
        startTime: time(),
        url: req.url,
        method: req.method,
        reqHeaders: req.headers,
        errored: false,
      };
      const delayPromise = delay.create(TIMEOUT);
      let id = req.headers['transaction-id'] || uniqueId();

      // Handle bad client transaction ids
      if(TRANSACTIONS[id]) {
        initializationPromise = Promise.reject(new HTTPError(
          400, 'E_TRANSACTION_ID_NOT_UNIQUE', id
        ));
        id = uniqueId();
      } else {
        initializationPromise = Promise.resolve();
      }

      transaction.id = id;
      TRANSACTIONS[id] = transaction;

      return [request, {
        id,
        start: startTransaction.bind(null, { id, req, res, delayPromise }, initializationPromise),
        catch: catchTransaction.bind(null, { id, req, res }),
        end: endTransaction.bind(null, { id, req, res, delayPromise }),
      }];
    });
  }

  function startTransaction({
    id, req, res, delayPromise,
  }, initializationPromise, buildResponse) {
    /* Architecture Note #3.2: Transaction start
    Once initiated, the transaction can be started. It
     basically spawns a promise that will be resolved
     to the actual response or rejected if the timeout
     is reached.
    */
    return Promise.race([
      initializationPromise
      .then(() => buildResponse()),
      delayPromise
      .then(() => {
        throw new HTTPError(
          504,
          'E_TRANSACTION_TIMEOUT',
          TIMEOUT,
          id
        );
      }),
    ]);
  }

  function catchTransaction({ id, req, res }, err) {
    /* Architecture Note #3.3: Transaction errors
    Here we are simply casting and logging errors.
     It is important for debugging but also for
     ending the transaction properly if an error
     occurs.
    */
    err = HTTPError.cast(err);
    log('error', 'An error occured', {
      guruMeditation: id,
      request: TRANSACTIONS[id].protocol +
        '://' + (req.headers.host || 'localhost') +
        TRANSACTIONS[id].url,
      verb: req.method,
      status: err.httpCode,
      code: err.code,
      stack: err.stack,
      details: err.params,
    });

    TRANSACTIONS[id].errored = true;

    throw err;
  }

  function endTransaction({
    id, req, res, delayPromise,
  }, response) {
    /* Architecture Note #3.4: Transaction end
    We end the transaction by writing the final status
     and headers and piping the response body if any.

    The transaction can till error at that time but it
     is too late for changing the response status so
     we are just logging the event.
     This could be handled with
     [HTTP trailers](https://nodejs.org/api/http.html#http_response_addtrailers_headers)
     but the lack of client side support for now is
     preventing us to use them.

     Once terminated, the transaction is removed
      from the `TRANSACTIONS` hash.
    */
    return new Promise((resolve, reject) => {
      res.on('error', reject);
      res.on('finish', resolve);
      res.writeHead(
        response.status,
        statuses[response.status],
        Object.assign(
          {},
          response.headers,
          { 'Transaction-Id': id }
        )
      );
      if(response.body && response.body.pipe) {
        response.body.pipe(res);
      } else {
        res.end();
      }
    })
    .catch((err) => {
      TRANSACTIONS[id].errored = true;
      log('error', 'An error occured', {
        guruMeditation: id,
        request: TRANSACTIONS[id].protocol + '://' +
          (req.headers.host || 'localhost') +
          TRANSACTIONS[id].url,
        method: req.method,
        stack: err.stack || err,
      });
    })
    .then(() => {
      TRANSACTIONS[id].endTime = time();
      TRANSACTIONS[id].endInBytes = req.socket.bytesRead;
      TRANSACTIONS[id].endOutBytes = req.socket.bytesWritten;
      TRANSACTIONS[id].statusCode = response.status;
      TRANSACTIONS[id].resHeaders = response.headers || {};

      log('info', TRANSACTIONS[id]);

      delete TRANSACTIONS[id];

      return delay.clear(delayPromise);
    });
  }
}
