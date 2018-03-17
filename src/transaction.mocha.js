/* eslint max-nested-callbacks: 0 */
'use strict';

const assert = require('assert');
const sinon = require('sinon');
const StreamTest = require('streamtest');
const YError = require('yerror');
const initDelay = require('common-services/dist/delay.mock').default;
const initHTTPTransaction = require('./transaction');

function streamifyBody(response) {
  return Object.assign({}, response, {
    body: StreamTest.v2.fromChunks([JSON.stringify(response.body)]),
  });
}

describe('initHTTPTransaction', () => {
  const VERBOSE_ENVS = [];
  const ENV = {
    NODE_ENV: 'development',
  };
  const log = sinon.stub();
  const time = sinon.stub();
  const uniqueId = sinon.stub();
  let delay;

  beforeEach(done => {
    log.reset();
    time.reset();
    time.returns(new Date('2012-01-15T00:00:00.000Z').getTime());
    uniqueId.reset();
    uniqueId.returns('[id]');
    initDelay({})
      .then(({ service }) => {
        delay = service;
      })
      .then(done)
      .catch(done);
  });

  it('should work', done => {
    initHTTPTransaction({
      ENV,
      VERBOSE_ENVS,
      log,
      time,
      delay,
      uniqueId,
    })
      .then(httpTransaction => {
        assert('function' === typeof httpTransaction);
        assert.deepEqual(log.args, [
          ['debug', 'HTTP Transaction initialized.'],
        ]);
      })
      .then(() => done())
      .catch(done);
  });

  describe('httpTransaction', () => {
    const buildResponse = sinon.stub();
    let res;
    let resBodyPromise;

    beforeEach(done => {
      buildResponse.reset();
      resBodyPromise = new Promise((resolve, reject) => {
        res = StreamTest.v2.toText((err, text) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(text);
        });
        res.writeHead = sinon.stub();
        done();
      });
    });

    it('should work', done => {
      initHTTPTransaction({
        ENV,
        VERBOSE_ENVS,
        log,
        time,
        delay,
        uniqueId,
      })
        .then(httpTransaction => {
          const req = {
            connection: { encrypted: true },
            ts: 1000000,
            ip: '127.0.0.1',
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {
              'x-forwarded-for': '127.0.0.1',
            },
            socket: {
              bytesRead: 16,
              bytesWritten: 64,
            },
          };

          buildResponse.returns(
            Promise.resolve({
              body: StreamTest.v2.fromChunks([
                JSON.stringify({
                  id: 1,
                  name: 'John Doe',
                }),
              ]),
              headers: {
                'Content-Type': 'application/json',
              },
              status: 200,
            })
          );

          return httpTransaction(req, res).then(([request, transaction]) =>
            transaction
              .start(buildResponse)
              .then(transaction.end)
              .then(() => {
                assert.deepEqual(buildResponse.args, [[]]);
                assert.equal(request.url, '/v1/users/1?extended=true');
                assert.equal(request.method, 'get');
                assert.deepEqual(request.headers, {
                  'x-forwarded-for': '127.0.0.1',
                });
                assert.equal(request.body, req);
                assert.deepEqual(res.writeHead.args, [
                  [
                    200,
                    'OK',
                    {
                      'Content-Type': 'application/json',
                      'Transaction-Id': '[id]',
                    },
                  ],
                ]);
                return resBodyPromise;
              })
              .then(text =>
                assert.deepEqual(text, '{"id":1,"name":"John Doe"}')
              )
          );
        })
        .then(() => done())
        .catch(done);
    });

    it('should fail on timeout', done => {
      initHTTPTransaction({
        ENV,
        VERBOSE_ENVS,
        log,
        time,
        delay,
        uniqueId,
      })
        .then(httpTransaction => {
          const req = {
            connection: { encrypted: true },
            ts: 1000000,
            ip: '127.0.0.1',
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {
              'x-forwarded-for': '127.0.0.1',
            },
            socket: {
              bytesRead: 16,
              bytesWritten: 64,
            },
          };

          buildResponse.returns(new Promise(() => {}));

          return httpTransaction(req, res).then(([, transaction]) => {
            const startPromise = transaction.start(buildResponse);

            delay.__resolveAll();

            return startPromise
              .then(transaction.end)
              .then(() => {
                throw new YError('E_UNEXPECTED_SUCCESS');
              })
              .catch(err => {
                assert.equal(err.code, 'E_TRANSACTION_TIMEOUT');
                assert.equal(err.httpCode, 504);
              });
          });
        })
        .then(() => done())
        .catch(done);
    });

    it('should fail with non-unique transaction id', done => {
      initHTTPTransaction({
        ENV,
        VERBOSE_ENVS,
        log,
        time,
        delay,
        uniqueId,
        TRANSACTIONS: { lol: {} },
      })
        .then(httpTransaction => {
          const req = {
            connection: { encrypted: true },
            ts: 1000000,
            ip: '127.0.0.1',
            method: 'GET',
            url: '/v1/users/1?extended=true',
            headers: {
              'x-forwarded-for': '127.0.0.1',
              'transaction-id': 'lol',
            },
            socket: {
              bytesRead: 16,
              bytesWritten: 64,
            },
          };

          buildResponse.returns(Promise.resolve());

          return httpTransaction(req, res)
            .then(([, transaction]) =>
              transaction
                .start(buildResponse)
                .catch(transaction.catch)
                .then(streamifyBody)
                .then(transaction.end)
            )
            .then(() => {
              throw new YError('E_UNEXPECTED_SUCCESS');
            })
            .catch(err => {
              assert.equal(err.code, 'E_TRANSACTION_ID_NOT_UNIQUE');
              assert.equal(err.httpCode, 400);
            });
        })
        .then(() => done())
        .catch(done);
    });
  });
});
