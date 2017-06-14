/* eslint max-nested-callbacks: 0 */
'use strict';

const sinon = require('sinon');
const assert = require('assert');
const supertest = require('supertest');

const { initializer, Knifecycle } = require('knifecycle');
const {
  initWepApplication,
} = require('../src');

const API = require('../fixtures/swagger.api.json');
const HANDLERS = {
  ping: initializer({
    name: 'ping',
    type: 'service',
  }, () => Promise.resolve(() => ({
    status: 200,
  }))),
  headUserAvatar: initializer({
    name: 'headUserAvatar',
    type: 'service',
  }, () => Promise.resolve(() => ({
    status: 200,
  }))),
  getUserAvatar: initializer({
    name: 'getUserAvatar',
    type: 'service',
  }, () => Promise.resolve(() => ({
    status: 200,
  }))),
  putUserAvatar: initializer({
    name: 'putUserAvatar',
    type: 'service',
  }, () => Promise.resolve(() => ({
    status: 200,
  }))),
  deleteUserAvatar: initializer({
    name: 'deleteUserAvatar',
    type: 'service',
  }, () => Promise.resolve(() => ({
    status: 200,
  }))),
  getUser: initializer({
    name: 'getUser',
    type: 'service',
    inject: ['db'],
  }, ({ db }) => Promise.resolve(
    ({ userId }) =>
    db.query('users', {
      id: userId,
    })
    .then(user => ({
      status: 200,
      headers: {},
      body: {
        id: userId,
        name: user.name,
      },
    }))
  )),
  putUser: initializer({
    name: 'putUser',
    type: 'service',
    inject: ['db'],
  }, ({ db }) => Promise.resolve(
    ({ userId }) =>
    db.query('users', {
      id: userId,
    })
    .then(user => ({
      status: 200,
      headers: {},
      body: {
        id: userId,
        name: user.name,
      },
    }))
  )),
};

describe('initWepApplication', () => {
  let $;

  beforeEach(() => {
    $ = new Knifecycle();
    initWepApplication(API, HANDLERS, $);
    $.constant('db', { query: sinon.stub() });
    $.constant('log', sinon.stub());
    $.constant('ENV', { PORT: 1664, HOST: 'localhost' });
    $.constant('time', sinon.stub().returns(1337));
  });

  describe('with a few routes', () => {

    it('should work as expected', (done) => {
      $.run(['ENV', 'log', 'db', 'httpServer', '$destroy'])
      .then(({ ENV, log, db, httpServer, $destroy }) => {
        db.query.returns(Promise.resolve({
          name: 'John Doe',
        }));
        return new Promise((resolve, reject) => {
          supertest(`http://${ENV.HOST}:${ENV.PORT}`)
          .get('/v1/users/1?extended=false')
          .expect(200)
          .end((err, res) => {
            if(err) {
              console.log('Logs:', log.args); // eslint-disable-line
              done(err);
              return;
            }
            assert.deepEqual(db.query.args, [[
              'users',
              { id: 1 },
            ]]);
            assert.deepEqual(res.body, {
              id: 1,
              name: 'John Doe',
            });
            resolve($destroy());
          });
        })
        .then(() => {
          assert.deepEqual(log.args, [[
            'debug',
            'Delay service initialized.',
          ], [
            'debug',
            'HTTP Transaction initialized.',
          ], [
            'debug',
            'HTTP Router initialized.',
          ], [
            'info',
            'HTTP Server listening at "http://localhost:1664".',
          ], [
            'debug',
            'Created a delay:',
            30000,
          ], [
            'info',
            {
              endInBytes: 151,
              endOutBytes: 191,
              endTime: 1337,
              id: '0',
              ip: '127.0.0.1',
              method: 'GET',
              protocol: 'http',
              reqHeaders: {
                'accept-encoding': 'gzip, deflate',
                connection: 'close',
                host: 'localhost:1664',
                'user-agent': 'node-superagent/3.5.2',
              },
              resHeaders: {
                'content-type': 'application/json',
              },
              startInBytes: 151,
              startOutBytes: 0,
              startTime: 1337,
              statusCode: 200,
              url: '/v1/users/1?extended=false',
              errored: false,
            },
          ], [
            'debug',
            'Cleared a delay',
          ], [
            'debug',
            'Closing HTTP server.',
          ], [
            'debug',
            'HTTP server closed',
          ]]);
        });
      })
      .then(() => done())
      .catch(done);
    });
  });
});
