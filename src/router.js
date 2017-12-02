'use strict';

const bytes = require('bytes');
const Stream = require('stream');
const { initializer } = require('knifecycle');
const HTTPError = require('yhttperror');
const YError = require('yerror');
const Siso = require('siso').default;
const Ajv = require('ajv');
const strictQs = require('strict-qs');
const { flattenSwagger, getSwaggerOperations } = require('./utils');
const {
  prepareValidators,
  applyValidators,
  filterHeaders,
} = require('./validation');
const {
  extractBodySpec,
  extractResponseSpec,
  checkResponseCharset,
  checkResponseMediaType,
  executeHandler,
} = require('./lib');
const { getBody, sendBody } = require('./body');

const SEARCH_SEPARATOR = '?';

const {
  DEFAULT_DEBUG_NODE_ENVS,
  DEFAULT_BUFFER_LIMIT,
  DEFAULT_PARSERS,
  DEFAULT_STRINGIFYERS,
  DEFAULT_DECODERS,
  DEFAULT_ENCODERS,
} = require('./constants');

function noop() {}
function identity(x) {
  return x;
}

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

module.exports = initializer(
  {
    name: 'httpRouter',
    inject: [
      '?ENV',
      '?DEBUG_NODE_ENVS',
      '?BUFFER_LIMIT',
      'HANDLERS',
      'API',
      '?PARSERS',
      '?STRINGIFYERS',
      '?DECODERS',
      '?ENCODERS',
      '?log',
      'httpTransaction',
      'errorHandler',
    ],
    options: { singleton: true },
  },
  initHTTPRouter
);

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
  ENV = {},
  DEBUG_NODE_ENVS = DEFAULT_DEBUG_NODE_ENVS,
  BUFFER_LIMIT = DEFAULT_BUFFER_LIMIT,
  HANDLERS,
  API,
  PARSERS = DEFAULT_PARSERS,
  STRINGIFYERS = DEFAULT_STRINGIFYERS,
  DECODERS = DEFAULT_DECODERS,
  ENCODERS = DEFAULT_ENCODERS,
  log = noop,
  httpTransaction,
  errorHandler,
}) {
  const bufferLimit = bytes.parse(BUFFER_LIMIT);
  const ajv = new Ajv({
    verbose: ENV && DEBUG_NODE_ENVS.includes(ENV.NODE_ENV),
  });
  const consumableCharsets = Object.keys(DECODERS);
  const produceableCharsets = Object.keys(ENCODERS);
  const defaultResponseSpec = {
    contentTypes: Object.keys(STRINGIFYERS),
    charsets: produceableCharsets,
  };

  return flattenSwagger(API)
    .then(_createRouters.bind(null, { HANDLERS, ajv }))
    .then(routers => {
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
        let responseSpec = defaultResponseSpec;

        return httpTransaction(req, res)
          .then(([request, transaction]) =>
            transaction
              .start(() =>
                Promise.resolve()
                  .then(() => {
                    const method = request.method;
                    const path = request.url.split(SEARCH_SEPARATOR)[0];
                    const search = request.url.substr(path.length);
                    const parts = path.split('/').filter(a => a);
                    let [result, pathParameters] = routers[method]
                      ? routers[method].find(parts)
                      : [];

                    // Second chance for HEAD calls
                    if (!result && 'head' === method) {
                      [result, pathParameters] = routers.get
                        ? routers.get.find(parts)
                        : [];
                    }

                    const { handler, operation: _operation_, validators } =
                      result || {};

                    if (!handler) {
                      log('debug', 'No handler found for: ', method, parts);
                      throw new HTTPError(404, 'E_NOT_FOUND', method, parts);
                    }

                    operation = _operation_;

                    return {
                      search,
                      pathParameters,
                      validators,
                      operation,
                      handler,
                    };
                  })
                  .then(
                    ({
                      search,
                      pathParameters,
                      validators,
                      operation,
                      handler,
                    }) => {
                      const consumableMediaTypes =
                        operation.consumes || API.consumes || [];
                      const produceableMediaTypes =
                        (operation && operation.produces) || API.produces || [];
                      const bodySpec = extractBodySpec(
                        request,
                        consumableMediaTypes,
                        consumableCharsets
                      );
                      responseSpec = extractResponseSpec(
                        operation,
                        request,
                        produceableMediaTypes,
                        produceableCharsets
                      );

                      return getBody(
                        {
                          DECODERS,
                          PARSERS,
                          bufferLimit,
                        },
                        operation,
                        request.body,
                        bodySpec
                      )
                        .then(body =>
                          Object.assign(
                            body ? { body } : {},
                            pathParameters,
                            strictQs(operation.parameters, search),
                            filterHeaders(operation.parameters, request.headers)
                          )
                        )
                        .then(parameters => {
                          applyValidators(operation, validators, parameters);
                          return parameters;
                        })
                        .catch(err => {
                          throw HTTPError.cast(err, 400);
                        })
                        .then(executeHandler.bind(null, operation, handler))
                        .then(response => {
                          if (response.body) {
                            response.headers['content-type'] =
                              response.headers['content-type'] ||
                              responseSpec.contentTypes[0];
                          }

                          // Check the stringifyer only when a schema is
                          // specified
                          const responseHasSchema =
                            operation.responses &&
                            operation.responses[response.status] &&
                            operation.responses[response.status].schema;

                          if (
                            responseHasSchema &&
                            !STRINGIFYERS[response.headers['content-type']]
                          ) {
                            return Promise.reject(
                              new HTTPError(
                                500,
                                'E_STRINGIFYER_LACK',
                                response.headers['content-type']
                              )
                            );
                          }
                          if (response.body) {
                            checkResponseCharset(
                              request,
                              responseSpec,
                              produceableCharsets
                            );
                            checkResponseMediaType(
                              request,
                              responseSpec,
                              produceableMediaTypes
                            );
                          }

                          return response;
                        });
                    }
                  )
              )
              .catch(transaction.catch)
              .catch(errorHandler.bind(null, transaction.id, responseSpec))
              .then(response => {
                if (response.body && 'head' === request.method) {
                  log(
                    'warning',
                    'Body stripped:',
                    response.body instanceof Stream ? response.body : 'Stream'
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
              .then(response =>
                sendBody(
                  {
                    DEBUG_NODE_ENVS,
                    ENV,
                    API,
                    ENCODERS,
                    STRINGIFYERS,
                    log,
                    ajv,
                  },
                  operation,
                  response
                )
              )
              .then(transaction.end)
          )
          .catch(handleFatalError);
      }
    });
}

function _explodePath(path, parameters) {
  return path
    .split('/')
    .filter(identity)
    .map(node => {
      const matches = /^{([a-z0-9]+)}$/i.exec(node);

      if (!matches) {
        return node;
      }

      const parameter = (parameters || []).find(
        aParameter => aParameter.name === matches[1]
      );

      if (!parameter) {
        throw new YError('E_UNDECLARED_PATH_PARAMETER', node);
      }
      return parameter;
    });
}

function _createRouters({ HANDLERS, ajv }, API) {
  const routers = {};

  return Promise.all(
    getSwaggerOperations(API).map(operation => {
      const { path, method, operationId, parameters } = operation;

      if (!path.startsWith('/')) {
        throw new YError('E_BAD_PATH', path);
      }
      if (!operationId) {
        throw new YError('E_NO_OPERATION_ID', path, method);
      }

      if (!HANDLERS[operationId]) {
        throw new YError('E_NO_HANDLER', operationId);
      }

      return Promise.resolve(HANDLERS[operationId]).then(handler => {
        routers[method] = routers[method] || new Siso();
        routers[method].register(
          _explodePath((API.basePath || '') + path, parameters),
          { handler, operation, validators: prepareValidators(ajv, operation) }
        );
      });
    })
  ).then(() => routers);
}
