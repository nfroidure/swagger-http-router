import assert from 'assert';
import sinon from 'sinon';
import initHTTPServer from './server';

describe('initHTTPServer', () => {
  const ENV = {};
  const PORT = 1339;
  const HOST = 'localhost';
  const log = sinon.stub();
  const httpRouter = sinon.stub().returns('[id]');

  beforeEach(() => {
    log.reset();
  });

  test('should work', async () => {
    const httpServer = await initHTTPServer({
      ENV,
      HOST,
      PORT,
      log,
      httpRouter,
    });

    assert.deepEqual(log.args, [
      ['info', `HTTP Server listening at "http://${HOST}:${PORT}".`],
    ]);

    await httpServer.dispose();
  });
});
