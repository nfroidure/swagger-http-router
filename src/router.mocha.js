/* eslint max-nested-callbacks: 0 */
'use strict';

const assert = require('assert');
const sinon = require('sinon');
const StreamTest = require('streamtest');
const HTTPError = require('yhttperror');
const YError = require('yerror');
const API = require('../fixtures/swagger.api.json');
const initHTTPRouter = require('./router');
const initErrorHandler = require('./errorHandler');

function waitResponse(response, raw) {
  return new Promise((resolve, reject) => {
    if (!response.body) {
      resolve(response);
      return;
    }
    response.body.pipe(
      StreamTest.v2.toText((err, text) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(
          Object.assign({}, response, {
            body: raw ? text : JSON.parse(text),
          })
        );
      })
    );
  });
}

describe('initHTTPRouter', () => {
  const log = sinon.stub();
  const handler = sinon.stub();
  const HANDLERS = {
    ping: handler,
    headUserAvatar: handler,
    getUserAvatar: handler,
    putUserAvatar: handler,
    deleteUserAvatar: handler,
    getUser: handler,
    putUser: handler,
  };
  const httpTransactionStart = sinon.spy(buildResponse => buildResponse());
  const httpTransactionCatch = sinon.spy(err => {
    throw HTTPError.cast(err);
  });
  const httpTransactionEnd = sinon.spy();
  const httpTransaction = sinon.spy(req =>
    Promise.resolve([
      {
        url: req.url,
        method: req.method.toLowerCase(),
        headers: req.headers,
        body: req,
      },
      {
        start: httpTransactionStart,
        catch: httpTransactionCatch,
        end: httpTransactionEnd,
      },
    ])
  );
  const res = {};

  beforeEach(() => {
    log.reset();
    handler.reset();
    httpTransaction.reset();
    httpTransactionStart.reset();
    httpTransactionCatch.reset();
    httpTransactionEnd.reset();
  });

  it('should work', done => {
    initErrorHandler({})
      .then(errorHandler =>
        initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        })
      )
      .then(httpRouter => {
        assert('function' === typeof httpRouter.service);
        assert(httpRouter.fatalErrorPromise.promise instanceof Promise);
        assert.deepEqual(log.args, [['debug', 'HTTP Router initialized.']]);
      })
      .then(() => done())
      .catch(done);
  });

  it('should fail when operation id is lacking', done => {
    initErrorHandler({})
      .then(errorHandler =>
        initHTTPRouter({
          HANDLERS,
          API: {
            host: API.host,
            swagger: API.swagger,
            info: API.info,
            basePath: API.basePath,
            schemes: API.schemes,
            paths: {
              '/lol': {
                get: {},
              },
            },
          },
          log,
          httpTransaction,
          errorHandler,
        })
      )
      .then(() => {
        throw new YError('E_UNEXPECTED_SUCCESS');
      })
      .catch(err => {
        assert.equal(err.code, 'E_NO_OPERATION_ID');
      })
      .then(() => done())
      .catch(done);
  });

  it('should fail when operation path is bad', done => {
    initErrorHandler({})
      .then(errorHandler =>
        initHTTPRouter({
          HANDLERS,
          API: {
            host: API.host,
            swagger: API.swagger,
            info: API.info,
            basePath: API.basePath,
            schemes: API.schemes,
            paths: {
              lol: {
                get: {},
              },
            },
          },
          log,
          httpTransaction,
          errorHandler,
        })
      )
      .then(() => {
        throw new YError('E_UNEXPECTED_SUCCESS');
      })
      .catch(err => {
        assert.equal(err.code, 'E_BAD_PATH');
      })
      .then(() => done())
      .catch(done);
  });

  it('should fail when a path parameter is lacking', done => {
    initErrorHandler({})
      .then(errorHandler =>
        initHTTPRouter({
          HANDLERS: {
            lol: handler,
          },
          API: {
            host: API.host,
            swagger: API.swagger,
            info: API.info,
            basePath: API.basePath,
            schemes: API.schemes,
            paths: {
              '/{lol}': {
                get: {
                  operationId: 'lol',
                },
              },
            },
          },
          log,
          httpTransaction,
          errorHandler,
        })
      )
      .then(() => {
        throw new YError('E_UNEXPECTED_SUCCESS');
      })
      .catch(err => {
        assert.equal(err.code, 'E_UNDECLARED_PATH_PARAMETER');
      })
      .then(() => done())
      .catch(done);
  });

  it('should fail when operation handler is lacking', done => {
    initErrorHandler({})
      .then(errorHandler =>
        initHTTPRouter({
          HANDLERS: {},
          API,
          log,
          httpTransaction,
          errorHandler,
        })
      )
      .then(() => {
        throw new YError('E_UNEXPECTED_SUCCESS');
      })
      .catch(err => {
        assert.equal(err.code, 'E_NO_HANDLER');
      })
      .then(() => done())
      .catch(done);
  });

  describe('httpRouter', () => {
    describe('HEAD', () => {
      it('should work with an existing route', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'image/jpeg',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'HEAD',
              url: '/v1/users/1/avatar',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              headers: {
                'content-type': 'image/jpeg',
              },
              status: 200,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with an existing GET route', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'HEAD',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              headers: {
                'content-type': 'application/json',
              },
              status: 200,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with a */* accept header', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'HEAD',
              url: '/v1/users/1?extended=true',
              headers: {
                accept: 'text/html,image/webp,image/apng,*/*;q=0.8',
              },
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              headers: {
                'content-type': 'application/json',
              },
              status: 200,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });
    });

    describe('GET', () => {
      it('should work with an existing stringified route', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                id: 1,
                name: 'John Doe',
              },
              headers: {
                'content-type': 'application/json',
              },
              status: 200,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with an existing streamed route', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'image/jpeg',
            },
            body: StreamTest.v2.fromChunks(['he', 'llo']),
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1/avatar',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0], true);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: 'hello',
              headers: {
                'content-type': 'image/jpeg',
              },
              status: 200,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail when stringifier lack', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({
          STRINGIFYERS: {
            'text/plain': JSON.stringify.bind(JSON),
          },
        })
          .then(errorHandler =>
            initHTTPRouter({
              STRINGIFYERS: {
                'text/plain': JSON.stringify.bind(JSON),
              },
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_STRINGIFYER_LACK',
                },
              },
              headers: {
                'content-type': 'text/plain',
                'cache-control': 'private',
              },
              status: 500,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail whith unacceptable media type', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {
                accept: 'text/word',
              },
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_UNACCEPTABLE_MEDIA_TYPE',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 406,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail when the handler returns nothing', done => {
        handler.returns();

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_NO_RESPONSE_PROMISE',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 500,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail when the handler returns no response', done => {
        handler.returns(Promise.resolve());

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_NO_RESPONSE',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 500,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail when the handler returns no status', done => {
        handler.returns(Promise.resolve({}));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_NO_RESPONSE_STATUS',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 500,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail without a required parameter', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_REQUIRED_PARAMETER',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with a bad parameter', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=lol',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_BAD_BOOLEAN',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with a handler erroring', done => {
        handler.returns(Promise.reject(new HTTPError(501, 'E_UNAUTHORIZED')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 501,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_UNAUTHORIZED',
                },
              },
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should proxy error headers', done => {
        const handlerError = new HTTPError(501, 'E_UNAUTHORIZED');

        handlerError.headers = {
          'X-Test': 'Error header',
        };
        handler.returns(Promise.reject(handlerError));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/users/1?extended=true',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 501,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
                'X-Test': 'Error header',
              },
              body: {
                error: {
                  code: 'E_UNAUTHORIZED',
                },
              },
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: true,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with an unexisting route', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'GET',
              url: '/v1/gods/1',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 404,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_NOT_FOUND',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });
    });

    describe('PUT', () => {
      it('should work with an existing stringified route', done => {
        handler.returns(
          Promise.resolve({
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '22',
              authorization: 'Bearer x',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                id: 1,
                name: 'John Doe',
              },
              headers: {
                'content-type': 'application/json',
              },
              status: 201,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              body: {
                name: 'John Doe',
              },
              authorization: 'Bearer x',
              contentType: 'application/json',
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with an existing streamed route', done => {
        handler.returns(
          Promise.resolve({
            status: 201,
            headers: {
              'content-type': 'image/jpeg',
            },
            body: StreamTest.v2.fromChunks(['he', 'llo']),
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks(['he', 'llo']);

            req.method = 'PUT';
            req.url = '/v1/users/1/avatar';
            req.headers = {
              'content-type': 'image/jpeg',
              'content-length': '4',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0], true);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: 'hello',
              headers: {
                'content-type': 'image/jpeg',
              },
              status: 201,
            });
            assert.deepEqual(handler.args.length, 1);
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with a bad content type header', done => {
        handler.returns(Promise.resolve({}));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'PUT',
              url: '/v1/users/1',
              headers: {
                'content-type': '$%$;;;===',
              },
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_BAD_CONTENT_TYPE',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 400,
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with an unsupported content type header', done => {
        handler.returns(Promise.resolve({}));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks(['he', 'llo']);

            req.method = 'PUT';
            req.url = '/v1/users/1/avatar';
            req.headers = {
              'content-type': 'text/plain',
              'content-length': '4',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_UNSUPPORTED_MEDIA_TYPE',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 415,
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with illegal contents according to the schema', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nat',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '22',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_BAD_PARAMETER',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with a bad content type', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': '#$===;;;==',
              'content-length': '22',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_BAD_CONTENT_TYPE',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with a bad content length', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '21',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_BAD_BODY_LENGTH',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail bad JSON contents', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              'nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '21',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_BAD_BODY',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with an erroring stream', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromErroredChunks(
              new Error('E_SHIT_HIT_THE_FAN'),
              ['{ ', 'nam', 'e": "John', ' Doe" }']
            );

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '21',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_REQUEST_FAILURE',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with too large contents', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              BUFFER_LIMIT: 20,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '21',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_REQUEST_CONTENT_TOO_LARGE',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail when parsers lacks', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              BUFFER_LIMIT: 20,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/vnd.github+json',
              'content-length': '21',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 500,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_PARSER_LACK',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });

      it('should work with a capitalized charset', done => {
        handler.returns(
          Promise.resolve({
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([
              '{ ',
              '"nam',
              'e": "John',
              ' Doe" }',
            ]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json;charset=UTF-8',
              'content-length': '22',
              authorization: 'Bearer x',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                id: 1,
                name: 'John Doe',
              },
              headers: {
                'content-type': 'application/json',
              },
              status: 201,
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              body: {
                name: 'John Doe',
              },
              authorization: 'Bearer x',
              contentType: 'application/json;charset=UTF-8',
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with unsupported charset', done => {
        handler.returns(
          Promise.resolve({
            status: 200,
            body: {
              name: 'John Doe',
            },
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([]);

            req.method = 'GET';
            req.url = '/v1/users/1?extended=false';
            req.headers = {
              authorization: 'Bearer teddy',
              'accept-charset': 'UTF-32;q=0.9, ISO-8859-1;q=0.8, UTF-16;q=0.7',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 406,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_UNACCEPTABLE_CHARSET',
                },
              },
            });
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
              extended: false,
            });
          })
          .then(() => done())
          .catch(done);
      });

      it('should fail with no contents at all', done => {
        handler.returns(Promise.reject(new Error('E_NOT_SUPPOSED_TO_BE_HERE')));

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              BUFFER_LIMIT: 20,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = StreamTest.v2.fromChunks([]);

            req.method = 'PUT';
            req.url = '/v1/users/1';
            req.headers = {
              'content-type': 'application/json',
              'content-length': '0',
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              status: 400,
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              body: {
                error: {
                  code: 'E_REQUIRED_PARAMETER',
                },
              },
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });
    });

    describe('DELETE', () => {
      it('with an existing route', done => {
        handler.returns(
          Promise.resolve({
            status: 410,
            headers: {},
          })
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'DELETE',
              url: '/v1/users/1/avatar',
              headers: {},
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              headers: {},
              status: 410,
            });
            assert.equal(handler.args.length, 1);
            assert.equal(handler.args.length, 1);
            assert.deepEqual(handler.args[0][0], {
              userId: 1,
            });
          })
          .then(() => done())
          .catch(done);
      });
    });

    describe('CUSTOMHEADER', () => {
      it('should 404', done => {
        handler.returns(
          Promise.reject(new YError('E_NOT_SUPPOSED_TO_BE_HERE'))
        );

        initErrorHandler({})
          .then(errorHandler =>
            initHTTPRouter({
              HANDLERS,
              API,
              log,
              httpTransaction,
              errorHandler,
            })
          )
          .then(httpRouter => {
            const req = {
              method: 'CUSTOMHEADER',
              url: '/v1/users/1?extended=true',
              headers: {
                'content-type': 'application/json; charset=utf-8',
              },
            };

            log.reset();

            return httpRouter.service(req, res);
          })
          .then(() => {
            assert(httpTransaction.calledOnce, 'Transaction initiated.');
            assert(httpTransactionEnd.calledOnce, 'Transaction ended.');
            return waitResponse(httpTransactionEnd.args[0][0]);
          })
          .then(response => {
            assert.deepEqual(response, {
              body: {
                error: {
                  code: 'E_NOT_FOUND',
                },
              },
              headers: {
                'content-type': 'application/json',
                'cache-control': 'private',
              },
              status: 404,
            });
            assert.deepEqual(handler.args, [], 'Handler not executed.');
          })
          .then(() => done())
          .catch(done);
      });
    });
  });
});
