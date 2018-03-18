import assert from 'assert';
import sinon from 'sinon';
import initHTTPServer from './server';

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

  test('should work', async () => {
    const httpServer = await initHTTPServer({
      ENV,
      log,
      httpRouter,
    });

    assert.deepEqual(log.args, [
      ['info', `HTTP Server listening at "http://${ENV.HOST}:${ENV.PORT}".`],
    ]);

    await httpServer.dispose();
  });
});
