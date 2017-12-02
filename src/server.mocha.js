'use strict';

const assert = require('assert');
const sinon = require('sinon');
const initHTTPServer = require('./server');

describe('initHTTPServer', () => {
  const ENV = {
    PORT: '1664',
    HOST: 'localhost',
  };
  const log = sinon.stub();
  const httpRouter = sinon.stub().returns('[id]');

  beforeEach(() => {
    log.reset();
  });

  it('should work', done => {
    initHTTPServer({
      ENV,
      log,
      httpRouter,
    })
      .then(httpServer => {
        assert.deepEqual(log.args, [
          [
            'info',
            `HTTP Server listening at "http://${ENV.HOST}:${ENV.PORT}".`,
          ],
        ]);
        return httpServer.dispose();
      })
      .then(() => done())
      .catch(done);
  });
});
