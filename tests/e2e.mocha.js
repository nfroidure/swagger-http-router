/* eslint max-nested-callbacks: 0 */
'use strict';

const { exec } = require('child_process');
const path = require('path');
const assert = require('assert');
const supertest = require('supertest');

describe('swagger-http-router', () => {
  describe('with a dry run', () => {
    it('should work', (done) => {
      new Promise((resolve, reject) => {
        exec(
          'node ' + path.join(__dirname, 'dry-run.js'),
          { env: Object.assign({}, process.env, { DRY_RUN: 1 }) },
          (err, stdout, stderr) => {
            if(err) {
              reject(err);
              return;
            }
            resolve({ stdout, stderr });
          }
        );
      })
      .then(({ stdout, stderr }) => {
        assert.equal(stdout.toString(),
`HTTP Server listening at "http://localhost:1337".
On air 🚀🌕
`
        );
        assert.equal(stderr.toString(),
`Logging service initialized.
Running in "development" environment.
Process service initialized.
Time service initialized.
Delay service initialized.
HTTP Transaction initialized.
HTTP Router initialized.
Closing HTTP server.
HTTP server closed
`
        );
      })
      .then(() => done())
      .catch(done);
    });
  });

  describe('with a remote call', () => {
    it('should work', (done) => {
      let resolveServerPromise;
      const serverPromise = new Promise((resolve) => {
        resolveServerPromise = resolve;
      });
      const shutdownPromise = new Promise((resolve, reject) => {
        exec(
          'node ' + path.join(__dirname, 'remote-shutdown.js'),
          { env: Object.assign({}, process.env) },
          (err, stdout, stderr) => {
            if(err) {
              reject(err);
              return;
            }
            resolve({ stdout, stderr });
          }
        ).stdout.on('data', (data) => {
          if(data.toString().includes('listening')) {
            resolveServerPromise();
          }
        });
      });

      serverPromise
      .then(() => new Promise((resolve, reject) => {
        supertest('http://127.0.0.1:1337')
        .post('/v1/shutdown')
        .expect(200)
        .end((err, res) => {
          if(err) {
            done(err);
            return;
          }
          resolve();
        });
      }))
      .then(() => {
        return shutdownPromise;
      })
      .then(({ stdout, stderr }) => {
        assert.equal(stdout.toString(),
`HTTP Server listening at "http://localhost:1337".
On air 🚀🌕
{ protocol: 'http',
  ip: '127.0.0.1',
  startInBytes: 157,
  startOutBytes: 0,
  startTime: 1267833600000,
  url: '/v1/shutdown',
  method: 'POST',
  reqHeaders: 
   { host: '127.0.0.1:1337',
     'accept-encoding': 'gzip, deflate',
     'user-agent': 'node-superagent/3.5.2',
     connection: 'close',
     'content-length': '0' },
  errored: false,
  id: '0',
  endTime: 1267833600000,
  endInBytes: 157,
  endOutBytes: 127,
  statusCode: 200,
  resHeaders: {} }
`
        );
        assert.equal(stderr.toString(),
`Logging service initialized.
Running in "development" environment.
Process service initialized.
Delay service initialized.
HTTP Transaction initialized.
HTTP Router initialized.
Created a delay: 30000
Cleared a delay
Closing HTTP server.
HTTP server closed
`
        );
      })
      .then(() => done())
      .catch(done);
    });
  });
});
