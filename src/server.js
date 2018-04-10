import { initializer } from 'knifecycle';
import http from 'http';

function noop() {}

/* Architecture Note #2: HTTP Server
The `httpServer` service is responsible for instanciating
 the httpServer and handling its start/shutdown.
*/

export default initializer(
  {
    name: 'httpServer',
    inject: ['ENV', 'httpRouter', '?log'],
  },
  initHTTPServer,
);

/**
 * Initialize an HTTP server
 * @param  {Object}   services
 * The services the server depends on
 * @param  {Object}   services.ENV
 * The process environment variables
 * @param  {Function} services.httpRouter
 * The function to run with the req/res tuple
 * @param  {Function} [services.log=noop]
 * A logging function
 * @return {Promise}
 * A promise of an object with a NodeJS HTTP server
 *  in its `service` property.
 */
async function initHTTPServer({ ENV, httpRouter, log = noop }) {
  const sockets = new Set();
  const httpServer = http.createServer(httpRouter);
  const listenPromise = new Promise(resolve => {
    httpServer.listen(parseInt(ENV.PORT, 10), ENV.HOST, () => {
      log('info', `HTTP Server listening at "http://${ENV.HOST}:${ENV.PORT}".`);
      resolve(httpServer);
    });
  });
  const errorPromise = new Promise((resolve, reject) => {
    httpServer.once('error', reject);
  });

  httpServer.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return Promise.race([listenPromise, errorPromise]).then(() => ({
    service: httpServer,
    errorPromise,
    dispose: () =>
      new Promise((resolve, reject) => {
        log('debug', 'Closing HTTP server.');
        // Avoid to keepalive connections on shutdown
        http.globalAgent.keepAlive = false;
        httpServer.close(err => {
          if (err) {
            reject(err);
            return;
          }
          log('debug', 'HTTP server closed');
          resolve();
        });
        if (ENV.DESTROY_SOCKETS) {
          for (const socket of sockets.values()) {
            socket.destroy();
          }
        }
      }),
  }));
}
