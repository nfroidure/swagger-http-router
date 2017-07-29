'use strict';

const bytes = require('bytes');
const Stream = require('stream');
const PassThrough = require('stream').PassThrough;
const { initializer } = require('knifecycle');
const HTTPError = require('yhttperror');
const YError = require('yerror');
const Siso = require('siso').default;
const Ajv = require('ajv');
const strictQs = require('strict-qs');
const firstChunkStream = require('first-chunk-stream');
const { parse: parseContentType } = require('content-type');
const {
  flattenSwagger,
  getSwaggerOperations,
} = require('./utils');
const {
  prepareValidators,
  applyValidators,
} = require('./validation');
const preferredCharsets = require('negotiator/lib/charset');
const preferredMediaType = require('negotiator/lib/encoding');

const SEARCH_SEPARATOR = '?';
const DEFAULT_DEBUG_NODE_ENVS = ['test', 'development'];
const DEFAULT_BUFFER_LIMIT = '500kB';
const DEFAULT_PARSERS = {
  'application/json': JSON.parse.bind(JSON),
};
const DEFAULT_STRINGIFYERS = {
  'application/json': JSON.stringify.bind(JSON),
};

function noop() {}
function identity(x) { return x; }

/* Architecture Note #2: HTTP Router
The `httpRouter` service is responsible for handling
 the request, validating it and wiring the handlers
 response to the actual HTTP response.

It is very opiniated and clearly diverges from the
 current standards based on a middlewares/plugins
 approach.

Here, the single source of truth is your API
 definition. No documentation, no route.
*/

module.exports = initializer({
  name: 'httpRouter',
  inject: [
    '?ENV', '?DEBUG_NODE_ENVS', '?BUFFER_LIMIT',
    'HANDLERS', 'API', '?PARSERS', '?STRINGIFYERS',
    '?log', 'httpTransaction',
  ],
  options: { singleton: true },
}, initHTTPRouter);


/**
 * Initialize an HTTP router
 * @param  {Object}   services
 * The services the server depends on
 * @param  {Object}   services.API
 * The Swagger definition of the API
 * @param  {Object}   services.HANDLERS
 * The handlers for the operations decribe
 *  by the Swagger API definition
 * @param  {Object}   [services.ENV]
 * The services the server depends on
 * @param  {Array}   [services.DEBUG_NODE_ENVS]
 * The environnement that activate debugging
 *  (prints stack trace in HTTP errors responses)
 * @param  {String}   [services.BUFFER_LIMIT]
 * The maximum bufferisation before parsing the
 *  request body
 * @param  {Object} [services.PARSERS]
 * The synchronous body parsers (for operations
 *  that defines a request body schema)
 * @param  {Object} [services.STRINGIFYERS]
 * The synchronous body stringifyers (for
 *  operations that defines a response body
 *  schema)
 * @param  {Function} [services.log=noop]
 * A logging function
 * @param  {Function} services.httpTransaction
 * A function to create a new HTTP transaction
 * @return {Promise}
 * A promise of a function to handle HTTP requests.
 */
function initHTTPRouter({
  ENV = {}, DEBUG_NODE_ENVS = DEFAULT_DEBUG_NODE_ENVS,
  BUFFER_LIMIT = DEFAULT_BUFFER_LIMIT,
  HANDLERS, API,
  PARSERS = DEFAULT_PARSERS,
  STRINGIFYERS = DEFAULT_STRINGIFYERS,
  log = noop, httpTransaction,
}) {
  const bufferLimit = bytes.parse(BUFFER_LIMIT);
  const ajv = new Ajv({
    verbose: ENV && DEBUG_NODE_ENVS.includes(ENV.NODE_ENV),
  });

  return flattenSwagger(API)
  .then(_createRouters.bind(null, { HANDLERS, ajv }))
  .then((routers) => {
    let handleFatalError;
    log('debug', 'HTTP Router initialized.');

    return {
      service: httpRouter,
      fatalErrorPromise: {
        promise: new Promise((resolve, reject) => {
          handleFatalError = reject;
        }),
      },
    };

    /**
     * Handle an HTTP incoming message
     * @param  {HTTPRequest}  req
     * A raw NodeJS HTTP incoming message
     * @param  {HTTPResponse} res
     * A raw NodeJS HTTP response
     * @return {Promise}
     * A promise resolving when the operation
     *  completes
     */
    function httpRouter(req, res) {
      let operation;
      let validMediaTypes = ['application/json'];

      return httpTransaction(req, res)
      .then(([request, transaction]) => transaction.start(() =>
        Promise.resolve()
        .then(() => {
          // Currently only utf-8 is supported
          const validEncodings = request.headers['accept-charset'] ?
          preferredCharsets(
            request.headers['accept-charset'],
            ['utf-8']
          ) :
          ['utf-8'];
          if(0 === validEncodings.length) {
            throw new HTTPError(
              406,
              'E_UNACCEPTABLE_CHARSET',
              request.headers['accept-charset']
            );
          }
        })
        .then(() => {
          const bodySpec = {
            contentType: '',
            contentLength: request.headers['content-length'] ?
            Number(request.headers['content-length']) :
            0,
            charset: 'utf-8',
          };

          if(request.headers['content-type']) {
            try {
              const parsedContentType = parseContentType(request.headers['content-type']);

              bodySpec.contentType = parsedContentType.type;
              if(
                parsedContentType.parameters &&
                parsedContentType.parameters.charset
              ) {
                bodySpec.charset = parsedContentType.parameters.charset;
              }
            } catch (err) {
              throw new HTTPError(400, 'E_BAD_CONTENT_TYPE');
            }
          }
          return bodySpec;
        })
        .then((bodySpec) => {
          const method = request.method;
          const path = request.url.split(SEARCH_SEPARATOR)[0];
          const search = request.url.substr(path.length);
          const parts = path.split('/').filter(a => a);
          let [result, pathParameters] = routers[method] ?
            routers[method].find(parts) :
            [];

          // Second chance for HEAD calls
          if((!result) && 'head' === method) {
            [result, pathParameters] = routers.get ?
              routers.get.find(parts) :
              [];
          }

          const { handler, operation: _operation_, validators } = result || {};

          if(!handler) {
            log('debug', 'No handler found for: ', method, parts);
            throw new HTTPError(404, 'E_NOT_FOUND', method, parts);
          }

          operation = _operation_;

          if(
            bodySpec.contentLength &&
            bodySpec.contentType &&
            !(operation.consumes || API.consumes || [])
              .includes(bodySpec.contentType)
          ) {
            throw new HTTPError(
              415,
              'E_UNSUPPORTED_MEDIA_TYPE',
              bodySpec.contentType,
              operation.consumes
            );
          }

          return getBody({
            PARSERS, bufferLimit,
          }, operation, request.body, bodySpec)
          .then(body => Object.assign(
            body ? { body } : {},
            pathParameters,
            strictQs(operation.parameters, search),
            _filterHeaders(operation.parameters, request.headers)
          ))
          .then((parameters) => {
            applyValidators(operation, validators, parameters);
            return parameters;
          })
          .catch((err) => { throw HTTPError.cast(err, 400); })
          .then((parameters) => {
            const responsePromise = handler(parameters, { method, parts });

            if(!(responsePromise && responsePromise.then)) {
              throw new HTTPError(
                500,
                'E_NO_RESPONSE_PROMISE',
                operation.operationId,
                method,
                parts
              );
            }
            return responsePromise;
          });
        }))
        .then((response) => {
          const accept = request.headers.accept || '*';

          validMediaTypes = preferredMediaType(
            '*/*' === accept ? '*' : accept,
            (operation && operation.produces) || API.produces || []
          );

          if(!response) {
            throw new HTTPError(500, 'E_NO_RESPONSE');
          }
          if('number' !== typeof response.status) {
            throw new HTTPError(500, 'E_NO_RESPONSE_STATUS');
          }

          response.headers = response.headers || {};

          if(
            response.body &&
            0 === validMediaTypes.length
          ) {
            throw new HTTPError(
              406,
              'E_UNACCEPTABLE_MEDIA_TYPE',
              accept
            );
          }

          // Check the stringifyer only when a schema is
          // specified
          if(
            operation.responses &&
            operation.responses[response.status] &&
            operation.responses[response.status].schema &&
            !STRINGIFYERS[validMediaTypes[0]]
          ) {
            return Promise.reject(new HTTPError(
              500,
              'E_STRINGIFYER_LACK',
              response.headers['content-type']
            ));
          }

          if(validMediaTypes[0]) {
            response.headers['content-type'] = validMediaTypes[0];
          }
          return response;
        })
        .catch(transaction.catch)
        .catch((err) => {
          const response = {};

          response.status = err.httpCode || 500;

          response.headers = {
            // Avoid caching errors
            'cache-control': 'private',
            // Fallback to the default stringifyer to always be
            // able to display errors
            'content-type':
              validMediaTypes[0] && STRINGIFYERS[validMediaTypes[0]] ?
              validMediaTypes[0] :
              Object.keys(STRINGIFYERS)[0],
          };

          response.body = {
            error: {
              code: err.code || 'E_UNEXPECTED',
              // Enjoy nerdy stuff: https://en.wikipedia.org/wiki/Guru_Meditation
              guruMeditation: transaction.id,
            },
          };

          if(ENV && DEBUG_NODE_ENVS.includes(ENV.NODE_ENV)) {
            response.body.error.stack = err.stack;
            response.body.error.params = err.params;
          }
          return response;
        })
        .then((response) => {
          if(
            response.body &&
            'head' === request.method
          ) {
            log('warning', 'Body stripped:',
              response.body instanceof Stream ?
              response.body :
              'Stream'
            );
            return Object.keys(response)
            .filter(key => 'body' !== key)
            .reduce((cleanedResponse, key) => {
              cleanedResponse[key] = response[key];
              return cleanedResponse;
            }, {});
          }
          return response;
        })
        // Here sendBody is not binded since we need
        // the `operation` value at the exact moment
        // of the then stage execution
        .then(response => sendBody({
          DEBUG_NODE_ENVS, ENV, API, STRINGIFYERS, log, ajv,
        }, operation, response))
        .then(transaction.end)
      )
      .catch(handleFatalError);
    }
  });
}

function _explodePath(path, parameters) {
  return path.split('/')
  .filter(identity)
  .map((node) => {
    const matches = (/^{([a-z0-9]+)}$/i).exec(node);

    if(!matches) {
      return node;
    }

    const parameter = (parameters || []).find(
      aParameter => aParameter.name === matches[1]
    );

    if(!parameter) {
      throw new YError('E_UNDECLARED_PATH_PARAMETER', node);
    }
    return parameter;
  });
}

/* Architecture Note #2.1: Request body
According to the Swagger/OpenAPI specification
there are two kinds of requests:
- **validated contents:** it implies to
 buffer their content and parse them to
 finally validate it. In that case, we
 provide it as a plain JS object to the
 handlers.
- **streamable contents:** often used
 for large files, those contents must
 be parsed and validated into the
 handler itself.
*/
function getBody({
  PARSERS, bufferLimit,
}, operation, inputStream, bodySpec) {
  const bodyParameter = (operation.parameters || [])
  .find(parameter => 'body' === parameter.in);
  const bodyIsEmpty = !(
    bodySpec.contentType &&
    bodySpec.contentLength
  );
  const bodyIsParseable = !(
    bodyParameter &&
    bodyParameter.schema
  );

  if(bodyIsEmpty) {
    return Promise.resolve();
  }

  if(bodyIsParseable) {
    return Promise.resolve(inputStream);
  }
  if(!PARSERS[bodySpec.contentType]) {
    return Promise.reject(new HTTPError(
      500, 'E_PARSER_LACK', bodySpec.contentType
    ));
  }
  return new Promise((resolve, reject) => {
    inputStream.on('error', (err) => {
      reject(HTTPError.wrap(err, 400, 'E_REQUEST_FAILURE'));
    });
    inputStream.pipe(firstChunkStream({
      chunkLength: bufferLimit + 1,
    }, (err, chunk, enc, cb) => {
      if(err) {
        reject(HTTPError.wrap(err, 400, 'E_REQUEST_FAILURE'));
        return;
      }
      if(bufferLimit >= chunk.length) {
        resolve(chunk);
        return;
      }
      reject(new HTTPError(
        400,
        'E_REQUEST_CONTENT_TOO_LARGE',
        chunk.length
      ));
    }));
  })
  .then((body) => {
    if(body.length !== bodySpec.contentLength) {
      throw new HTTPError(400, 'E_BAD_BODY_LENGTH', body.length, bodySpec.contentLength);
    }
    try {
      return PARSERS[bodySpec.contentType](body.toString(body.charset));
    } catch (err) {
      throw HTTPError.wrap(err, 400, 'E_BAD_BODY');
    }
  });
}

function sendBody({
  DEBUG_NODE_ENVS, ENV, API, STRINGIFYERS, log, ajv,
}, operation, response) {
  const schema = ((
      operation &&
      operation.responses &&
      operation.responses[response.status] &&
      operation.responses[response.status].schema
    ) || (
      // Here we are diverging from the Swagger specs
      // since global responses object aren't intended
      // to set global responses but for routes that
      // does not exists or that has not been resolved
      // by the router at the time an error were throwed
      // we simply cannot rely on the `operation`'s value.
      // See: https://github.com/OAI/OpenAPI-Specification/issues/563
      API.responses &&
      API.responses[response.status] &&
      API.responses[response.status].schema
    )
  );

  if(!response.body) {
    if(schema) {
      log('warning', `Declared a schema in the ${
        operation.id
      } response but found no body.`);
    }
    return response;
  }

  if(response.body instanceof Stream) {
    if(schema) {
      log('warning', `Declared a schema in the ${
        operation.id
      } response but returned a streamed body.`);
    }
    return response;
  }

  const stream = new PassThrough();

  if(schema) {
    if(DEBUG_NODE_ENVS.includes(ENV.NODE_ENV)) {
      const validator = ajv.compile(schema);

      if(!validator(response.body)) {
        log('warning', 'Invalid response:', validator.errors);
      }
    }
  } else {
    // When there is no schema specified for a given
    // response, it means that either the response was
    // not documented or that the request failed before
    // the router could determine which operation were
    // executed.
    log('warning', 'Undocumented response:', response.status, operation);
  }

  stream.write(STRINGIFYERS[
    response.headers['content-type']
  ](response.body));

  stream.end();
  return Object.assign({}, response, {
    headers: Object.assign({
      'content-type': `${
        response.headers['content-type']
      }; charset=utf-8`,
    }, response.headers),
    body: stream,
  });
}

function _createRouters({ HANDLERS, ajv }, API) {
  const routers = {};

  return Promise.all(
    getSwaggerOperations(API)
    .map((operation) => {
      const { path, method, operationId, parameters } = operation;

      if(!path.startsWith('/')) {
        throw new YError('E_BAD_PATH', path);
      }
      if(!operationId) {
        throw new YError('E_NO_OPERATION_ID', path, method);
      }

      if(!HANDLERS[operationId]) {
        throw new YError('E_NO_HANDLER', operationId);
      }

      return Promise.resolve(HANDLERS[operationId])
      .then((handler) => {
        routers[method] = routers[method] || new Siso();
        routers[method].register(
          _explodePath((API.basePath || '') + path, parameters),
          { handler, operation, validators: prepareValidators(ajv, operation) }
        );
      });
    })
  )
  .then(() => routers);
}

function _filterHeaders(parameters, headers) {

  return (parameters || [])
    .filter(parameter => 'header' === parameter.in)
    .reduce((filteredHeaders, parameter) => {
      if(headers[parameter.name.toLowerCase()]) {
        filteredHeaders[parameter.name.toLowerCase()] =
          headers[parameter.name.toLowerCase()];
      }
      return filteredHeaders;
    }, {});
}
