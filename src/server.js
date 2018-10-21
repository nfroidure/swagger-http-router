import { initializer } from 'knifecycle';
import http from 'http';
import ms from 'ms';

function noop() {}

/* Architecture Note #2: HTTP Server
The `httpServer` service is responsible for instanciating
 the httpServer and handling its start/shutdown.
*/

export default initializer(
  {
    name: 'httpServer',
    inject: [
      '?ENV',
      '?HOST',
      '?PORT',
      '?MAX_HEADERS_COUNT',
      '?KEEP_ALIVE_TIMEOUT',
      '?MAX_CONNECTIONS',
      '?TIMEOUT',
      'httpRouter',
      '?log',
    ],
  },
  initHTTPServer,
);

/**
 * Initialize an HTTP server
 * @param  {Object}   services
 * The services the server depends on
 * @param  {Object}   services.ENV
 * The process environment variables
 * @param  {Object}   services.HOST
 * The server host
 * @param  {Object}   services.PORT
 * The server port
 * @param  {Object}   services.MAX_HEADERS_COUNT
 * The https://nodejs.org/api/http.html#http_server_maxheaderscount
 * @param  {Object}   services.KEEP_ALIVE_TIMEOUT
 * See https://nodejs.org/api/http.html#http_server_keepalivetimeout
 * @param  {Object}   services.MAX_CONNECTIONS
 * See https://nodejs.org/api/net.html#net_server_maxconnections
 * @param  {Object}   services.TIMEOUT
 * See https://nodejs.org/api/http.html#http_server_timeout
 * @param  {Function} services.httpRouter
 * The function to run with the req/res tuple
 * @param  {Function} [services.log=noop]
 * A logging function
 * @return {Promise}
 * A promise of an object with a NodeJS HTTP server
 *  in its `service` property.
 */
async function initHTTPServer({
  ENV = {},
  HOST = '127.0.0.1',
  PORT = 8080,
  MAX_HEADERS_COUNT = 800,
  KEEP_ALIVE_TIMEOUT = ms('5m'),
  TIMEOUT = ms('2m'),
  MAX_CONNECTIONS,
  httpRouter,
  log = noop,
}) {
  const sockets = ENV.DESTROY_SOCKETS ? new Set() : {}.undef;
  const httpServer = http.createServer(httpRouter);
  const listenPromise = new Promise(resolve => {
    httpServer.listen(PORT, HOST, () => {
      log('info', `HTTP Server listening at "http://${HOST}:${PORT}".`);
      resolve(httpServer);
    });
  });
  const errorPromise = new Promise((resolve, reject) => {
    httpServer.once('error', reject);
  });

  httpServer.timeout = TIMEOUT;
  httpServer.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
  httpServer.maxHeadersCount = MAX_HEADERS_COUNT;
  httpServer.maxConnections = MAX_CONNECTIONS;

  if ('undefined' !== typeof MAX_CONNECTIONS) {
    httpServer.maxConnections = MAX_CONNECTIONS;
  }

  if (ENV.DESTROY_SOCKETS) {
    httpServer.on('connection', socket => {
      sockets.add(socket);
      socket.on('close', () => {
        sockets.delete(socket);
      });
    });
  }

  return Promise.race([listenPromise, errorPromise]).then(() => ({
    service: httpServer,
    errorPromise,
    dispose: () =>
      new Promise((resolve, reject) => {
        log('debug', 'Closing HTTP server.');
        // Avoid to keepalive connections on shutdown
        httpServer.timeout = 1;
        httpServer.keepAliveTimeout = 1;
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
