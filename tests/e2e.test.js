/* eslint max-nested-callbacks: 0 */
import { exec } from 'child_process';
import path from 'path';
import assert from 'assert';
import supertest from 'supertest';

describe('swagger-http-router', () => {
  describe('with a dry run', () => {
    test('should work', async () => {
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        exec(
          'babel-node ' + path.join(__dirname, 'dry-run.js'),
          {
            env: Object.assign({}, process.env, {
              NODE_ENV: 'development',
              DRY_RUN: 1,
            }),
          },
          (err, stdout, stderr) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({ stdout, stderr });
          },
        );
      });
      assert.equal(
        stdout.toString(),
        `HTTP Server listening at "http://localhost:1337".
On air 🚀🌕
`,
      );
      assert.equal(
        stderr.toString(),
        `Logging service initialized.
Time service initialized.
Delay service initialized.
Running in "development" environment.
Process service initialized.
HTTP Transaction initialized.
HTTP Router initialized.
Closing HTTP server.
HTTP server closed
Cancelling pending timeouts: 0
`,
      );
    }, 15000);
  });

  describe('with a remote call', () => {
    test('should work', async () => {
      let resolveServerPromise;

      const serverPromise = new Promise(resolve => {
        resolveServerPromise = resolve;
      });

      const shutdownPromise = new Promise((resolve, reject) => {
        exec(
          'babel-node ' + path.join(__dirname, 'remote-shutdown.js'),
          {
            env: Object.assign({}, process.env, {
              NODE_ENV: 'development',
              DESTROY_SOCKETS: 1,
            }),
          },
          (err, stdout, stderr) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({ stdout, stderr });
          },
        ).stdout.on('data', data => {
          if (data.toString().includes('listening')) {
            resolveServerPromise();
          }
        });
      });

      await serverPromise;
      await new Promise((resolve, reject) => {
        supertest('http://127.0.0.1:1338')
          .post('/v1/shutdown')
          .unset('User-Agent')
          .expect(200)
          .end(err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
      });

      const { stdout, stderr } = await shutdownPromise;

      expect(trimLinesEnd(stdout.toString())).toEqual(
        trimLinesEnd(
          `HTTP Server listening at "http://localhost:1338".
On air 🚀🌕
{ protocol: 'http',
  ip: '127.0.0.1',
  startInBytes: 122,
  startOutBytes: 0,
  startTime: 1267833600000,
  url: '/v1/shutdown',
  method: 'POST',
  reqHeaders:
   { host: '127.0.0.1:1338',
     'accept-encoding': 'gzip, deflate',
     connection: 'close',
     'content-length': '0' },
  errored: false,
  id: '0',
  endTime: 1267833600000,
  endInBytes: 122,
  endOutBytes: 127,
  statusCode: 200,
  resHeaders: {} }
`,
        ),
      );
      expect(trimLinesEnd(stderr.toString())).toEqual(
        trimLinesEnd(`Logging service initialized.
Delay service initialized.
Running in "development" environment.
Process service initialized.
HTTP Transaction initialized.
HTTP Router initialized.
Created a delay: 30000
Cleared a delay
Closing HTTP server.
HTTP server closed
Cancelling pending timeouts: 0
`),
      );
    }, 15000);
  });
});

// Needed to avoid editor/cli small variations issues
function trimLinesEnd(str) {
  return str.replace(/\s+(\r?\n)/g, '$1');
}
