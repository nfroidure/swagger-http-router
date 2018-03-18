/* eslint max-nested-callbacks: 0 */
import assert from 'assert';
import sinon from 'sinon';
import StreamTest from 'streamtest';
import YError from 'yerror';
import initDelay from 'common-services/dist/delay.mock';
import initHTTPTransaction from './transaction';

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

  test('should work', async () => {
    const httpTransaction = await initHTTPTransaction({
      ENV,
      VERBOSE_ENVS,
      log,
      time,
      delay,
      uniqueId,
    });

    assert('function' === typeof httpTransaction);
    assert.deepEqual(log.args, [['debug', 'HTTP Transaction initialized.']]);
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

    test('should work', async () => {
      const httpTransaction = await initHTTPTransaction({
        ENV,
        VERBOSE_ENVS,
        log,
        time,
        delay,
        uniqueId,
      });
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
        }),
      );

      const [request, transaction] = await httpTransaction(req, res);
      await transaction.start(buildResponse).then(transaction.end);

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

      const text = await resBodyPromise;

      assert.deepEqual(text, '{"id":1,"name":"John Doe"}');
    });

    test('should fail on timeout', async () => {
      try {
        const httpTransaction = await initHTTPTransaction({
          ENV,
          VERBOSE_ENVS,
          log,
          time,
          delay,
          uniqueId,
        });
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

        const [, transaction] = await httpTransaction(req, res);
        const startPromise = transaction.start(buildResponse);

        await delay.__resolveAll();

        await startPromise.then(transaction.end);

        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        assert.equal(err.code, 'E_TRANSACTION_TIMEOUT');
        assert.equal(err.httpCode, 504);
      }
    });

    test('should fail with non-unique transaction id', async () => {
      try {
        const httpTransaction = await initHTTPTransaction({
          ENV,
          VERBOSE_ENVS,
          log,
          time,
          delay,
          uniqueId,
          TRANSACTIONS: { lol: {} },
        });
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

        const [, transaction] = await httpTransaction(req, res);

        await transaction
          .start(buildResponse)
          .catch(transaction.catch)
          .then(streamifyBody)
          .then(transaction.end);

        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err.code).toEqual('E_TRANSACTION_ID_NOT_UNIQUE');
        expect(err.httpCode).toEqual(400);
      }
    });
  });
});
