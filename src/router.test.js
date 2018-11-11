/* eslint max-nested-callbacks: 0 */
import assert from 'assert';
import StreamTest from 'streamtest';
import HTTPError from 'yhttperror';
import YError from 'yerror';
import API from '../fixtures/swagger.api.json';
import initHTTPRouter from './router';
import initErrorHandler from './errorHandler';

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
          }),
        );
      }),
    );
  });
}

function prepareTransaction(result) {
  const handler = jest.fn(() =>
    null === result
      ? {}.undef
      : result
      ? Promise.resolve(result)
      : Promise.reject(new YError('E_NOT_SUPPOSED_TO_BE_HERE')),
  );
  const httpTransactionStart = jest.fn(async buildResponse => buildResponse());
  const httpTransactionCatch = jest.fn(async err => {
    throw HTTPError.cast(err);
  });
  const httpTransactionEnd = jest.fn(async () => {});
  const httpTransaction = jest.fn(async req => [
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
  ]);
  const HANDLERS = {
    ping: handler,
    headUserAvatar: handler,
    getUserAvatar: handler,
    putUserAvatar: handler,
    deleteUserAvatar: handler,
    getUser: handler,
    putUser: handler,
  };
  return {
    HANDLERS,
    httpTransaction,
    httpTransactionStart,
    httpTransactionCatch,
    httpTransactionEnd,
    handler,
  };
}

describe('initHTTPRouter', () => {
  const log = jest.fn();
  const res = {};

  beforeEach(() => {
    log.mockReset();
  });

  test('should work', async () => {
    let { httpTransaction, HANDLERS } = prepareTransaction();
    const errorHandler = await initErrorHandler({});
    const httpRouter = await initHTTPRouter({
      HANDLERS,
      API,
      log,
      httpTransaction,
      errorHandler,
    });

    assert('function' === typeof httpRouter.service);
    assert(httpRouter.fatalErrorPromise.promise instanceof Promise);
    assert.deepEqual(log.mock.calls, [['debug', 'HTTP Router initialized.']]);
  });

  describe('should fail', () => {
    test('when operation id is lacking', async () => {
      try {
        let { httpTransaction, HANDLERS } = prepareTransaction();
        const errorHandler = await initErrorHandler({});

        await initHTTPRouter({
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
        });

        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        assert.equal(err.code, 'E_NO_OPERATION_ID');
      }
    });

    test('when operation path is bad', async () => {
      try {
        const errorHandler = await initErrorHandler({});
        let { httpTransaction, HANDLERS } = prepareTransaction();

        await initHTTPRouter({
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
        });
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        assert.equal(err.code, 'E_BAD_PATH');
      }
    });

    test('when a path parameter is lacking', async () => {
      try {
        let { httpTransaction, handler } = prepareTransaction();
        const errorHandler = await initErrorHandler({});

        await initHTTPRouter({
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
        });

        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        assert.equal(err.code, 'E_UNDECLARED_PATH_PARAMETER');
      }
    });

    test('when operation handler is lacking', async () => {
      try {
        let { httpTransaction } = prepareTransaction();
        const errorHandler = await initErrorHandler({});
        await initHTTPRouter({
          HANDLERS: {},
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        assert.equal(err.code, 'E_NO_HANDLER');
      }
    });
  });

  describe('httpRouter', () => {
    describe('HEAD', () => {
      test('should work with an existing route', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction({
          status: 200,
          headers: {
            'content-type': 'image/jpeg',
          },
        });

        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'HEAD',
          url: '/v1/users/1/avatar',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).not.toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
          headers: {
            'content-type': 'image/jpeg',
          },
          status: 200,
        });
        expect(handler.mock.calls[0][0]).toEqual({
          userId: 1,
        });
      });

      test('should work with an existing GET route', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction({
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: 1,
            name: 'John Doe',
          },
        });
        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'HEAD',
          url: '/v1/users/1?extended=true',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).not.toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });
        expect(handler.mock.calls[0][0]).toEqual({
          userId: 1,
          extended: true,
        });
      });

      test('should work with a */* accept header', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction({
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
          body: {
            id: 1,
            name: 'John Doe',
          },
        });
        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });

        const req = {
          method: 'HEAD',
          url: '/v1/users/1?extended=true',
          headers: {
            accept: 'text/html,image/webp,image/apng,*/*;q=0.8',
          },
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).not.toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
        expect(handler.mock.calls[0][0]).toEqual({
          userId: 1,
          extended: true,
        });
      });
    });

    describe('GET', () => {
      describe('should work', () => {
        test('with an existing stringified route', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {},
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).not.toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
            body: {
              id: 1,
              name: 'John Doe',
            },
            headers: {
              'content-type': 'application/json',
            },
            status: 200,
          });
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: true,
          });
        });

        test('with an existing streamed route', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 200,
            headers: {
              'content-type': 'image/jpeg',
            },
            body: StreamTest.v2.fromChunks(['he', 'llo']),
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'GET',
            url: '/v1/users/1/avatar',
            headers: {},
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).not.toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
            true,
          );

          expect(response).toEqual({
            body: 'hello',
            headers: {
              'content-type': 'image/jpeg',
            },
            status: 200,
          });
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
          });
        });
      });

      describe('should lately fail', () => {
        test('when stringifier lack', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          });
          const errorHandler = await initErrorHandler({
            STRINGIFYERS: {
              'text/plain': JSON.stringify.bind(JSON),
            },
          });
          const httpRouter = await initHTTPRouter({
            STRINGIFYERS: {
              'text/plain': JSON.stringify.bind(JSON),
            },
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {},
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: true,
          });
        });

        test('whith unacceptable media type', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });

          const req = {
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {
              accept: 'text/word',
            },
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: true,
          });
        });

        test('when the handler returns nothing', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction(null);
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {},
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: true,
          });
        });

        test('when the handler returns no response', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction(Promise.resolve());

          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {},
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: true,
          });
        });

        test('when the handler returns no status', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction(Promise.resolve({}));
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {},
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: true,
          });
        });
      });

      describe('should fail', () => {});
      test('should fail without a required parameter', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction();

        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });

        const req = {
          method: 'GET',
          url: '/v1/users/1',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).not.toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );
        expect(response).toEqual({
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
      });

      test('should fail with a bad parameter', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction();

        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'GET',
          url: '/v1/users/1?extended=lol',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).not.toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
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
      });

      test('should work with a handler erroring', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction(
          Promise.reject(new HTTPError(501, 'E_UNAUTHORIZED')),
        );

        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'GET',
          url: '/v1/users/1?extended=true',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
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
        expect(handler.mock.calls[0][0]).toEqual({
          userId: 1,
          extended: true,
        });
      });

      test('should proxy error headers', async () => {
        const handlerError = new HTTPError(501, 'E_UNAUTHORIZED');

        handlerError.headers = {
          'X-Test': 'Error header',
        };
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction(Promise.reject(handlerError));
        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'GET',
          url: '/v1/users/1?extended=true',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
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
        expect(handler.mock.calls[0][0]).toEqual({
          userId: 1,
          extended: true,
        });
      });

      test('should work with an unexisting route', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction();

        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'GET',
          url: '/v1/gods/1',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).not.toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
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
      });
    });

    describe('PUT', () => {
      describe('should work', () => {
        test('with an existing stringified route', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).not.toBeCalled();
          expect(httpTransactionEnd).toBeCalled();
          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
            body: {
              id: 1,
              name: 'John Doe',
            },
            headers: {
              'content-type': 'application/json',
            },
            status: 201,
          });
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            body: {
              name: 'John Doe',
            },
            authorization: 'Bearer x',
            contentType: 'application/json',
          });
        });

        test('with an existing streamed route', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 201,
            headers: {
              'content-type': 'image/jpeg',
            },
            body: StreamTest.v2.fromChunks(['he', 'llo']),
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = StreamTest.v2.fromChunks(['he', 'llo']);

          req.method = 'PUT';
          req.url = '/v1/users/1/avatar';
          req.headers = {
            'content-type': 'image/jpeg',
            'content-length': '4',
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).not.toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
            true,
          );

          expect(response).toEqual({
            body: 'hello',
            headers: {
              'content-type': 'image/jpeg',
            },
            status: 201,
          });
        });

        test('with a capitalized charset', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
            body: {
              id: 1,
              name: 'John Doe',
            },
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).not.toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
            body: {
              id: 1,
              name: 'John Doe',
            },
            headers: {
              'content-type': 'application/json',
            },
            status: 201,
          });
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            body: {
              name: 'John Doe',
            },
            authorization: 'Bearer x',
            contentType: 'application/json;charset=UTF-8',
          });
        });
      });

      describe('should fail', () => {
        test('with a bad content type header', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction(Promise.resolve({}));
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = {
            method: 'PUT',
            url: '/v1/users/1',
            headers: {
              'content-type': '$%$;;;===',
            },
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with an unsupported content type header', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction(Promise.resolve({}));
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = StreamTest.v2.fromChunks(['he', 'llo']);

          req.method = 'PUT';
          req.url = '/v1/users/1/avatar';
          req.headers = {
            'content-type': 'text/plain',
            'content-length': '4',
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();
          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with illegal contents according to the schema', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with a bad content type', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with a bad content length', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('bad JSON contents', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with an erroring stream', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = StreamTest.v2.fromErroredChunks(
            new Error('E_SHIT_HIT_THE_FAN'),
            ['{ ', 'nam', 'e": "John', ' Doe" }'],
          );

          req.method = 'PUT';
          req.url = '/v1/users/1';
          req.headers = {
            'content-type': 'application/json',
            'content-length': '21',
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with too large contents', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            BUFFER_LIMIT: 20,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('when parsers lacks', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            BUFFER_LIMIT: 20,
            log,
            httpTransaction,
            errorHandler,
          });
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

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });

        test('with unsupported charset', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction({
            status: 200,
            body: {
              name: 'John Doe',
            },
          });
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = StreamTest.v2.fromChunks([]);

          req.method = 'GET';
          req.url = '/v1/users/1?extended=false';
          req.headers = {
            authorization: 'Bearer teddy',
            'accept-charset': 'UTF-32;q=0.9, ISO-8859-1;q=0.8, UTF-16;q=0.7',
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
          expect(handler.mock.calls[0][0]).toEqual({
            userId: 1,
            extended: false,
          });
        });

        test('with no contents at all', async () => {
          let {
            httpTransaction,
            httpTransactionStart,
            httpTransactionCatch,
            httpTransactionEnd,
            handler,
            HANDLERS,
          } = prepareTransaction();
          const errorHandler = await initErrorHandler({});
          const httpRouter = await initHTTPRouter({
            HANDLERS,
            API,
            BUFFER_LIMIT: 20,
            log,
            httpTransaction,
            errorHandler,
          });
          const req = StreamTest.v2.fromChunks([]);

          req.method = 'PUT';
          req.url = '/v1/users/1';
          req.headers = {
            'content-type': 'application/json',
            'content-length': '0',
          };

          log.mockReset();

          await httpRouter.service(req, res);

          expect(handler).not.toBeCalled();
          expect(httpTransaction).toBeCalled();
          expect(httpTransactionStart).toBeCalled();
          expect(httpTransactionCatch).toBeCalled();
          expect(httpTransactionEnd).toBeCalled();

          const response = await waitResponse(
            httpTransactionEnd.mock.calls[0][0],
          );

          expect(response).toEqual({
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
        });
      });
    });

    describe('DELETE', () => {
      test('with an existing route', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction({
          status: 410,
          headers: {},
        });
        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'DELETE',
          url: '/v1/users/1/avatar',
          headers: {},
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).not.toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
          headers: {},
          status: 410,
        });
        expect(handler.mock.calls[0][0]).toEqual({
          userId: 1,
        });
      });
    });

    describe('CUSTOMHEADER', () => {
      test('should 404', async () => {
        let {
          httpTransaction,
          httpTransactionStart,
          httpTransactionCatch,
          httpTransactionEnd,
          handler,
          HANDLERS,
        } = prepareTransaction();
        const errorHandler = await initErrorHandler({});
        const httpRouter = await initHTTPRouter({
          HANDLERS,
          API,
          log,
          httpTransaction,
          errorHandler,
        });
        const req = {
          method: 'CUSTOMHEADER',
          url: '/v1/users/1?extended=true',
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        };

        log.mockReset();

        await httpRouter.service(req, res);

        expect(handler).not.toBeCalled();
        expect(httpTransaction).toBeCalled();
        expect(httpTransactionStart).toBeCalled();
        expect(httpTransactionCatch).toBeCalled();
        expect(httpTransactionEnd).toBeCalled();

        const response = await waitResponse(
          httpTransactionEnd.mock.calls[0][0],
        );

        expect(response).toEqual({
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
      });
    });
  });
});
