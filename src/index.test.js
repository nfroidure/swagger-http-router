/* eslint max-nested-callbacks: 0 */
import sinon from 'sinon';
import assert from 'assert';
import supertest from 'supertest';

import Knifecycle, { initializer, constant } from 'knifecycle';
import { initWepApplication } from '../src';

import API from '../fixtures/swagger.api.json';
const HANDLERS = {
  ping: initializer(
    {
      name: 'ping',
      type: 'service',
    },
    async () => async () => ({
      status: 200,
    }),
  ),
  headUserAvatar: initializer(
    {
      name: 'headUserAvatar',
      type: 'service',
    },
    async () => async () => ({
      status: 200,
    }),
  ),
  getUserAvatar: initializer(
    {
      name: 'getUserAvatar',
      type: 'service',
    },
    async () => async () => ({
      status: 200,
    }),
  ),
  putUserAvatar: initializer(
    {
      name: 'putUserAvatar',
      type: 'service',
    },
    async () => async () => ({
      status: 200,
    }),
  ),
  deleteUserAvatar: initializer(
    {
      name: 'deleteUserAvatar',
      type: 'service',
    },
    async () => async () => ({
      status: 200,
    }),
  ),
  getUser: initializer(
    {
      name: 'getUser',
      type: 'service',
      inject: ['db'],
    },
    async ({ db }) => async ({ userId }) => {
      const user = await db.query('users', {
        id: userId,
      });

      return {
        status: 200,
        headers: {},
        body: {
          id: userId,
          name: user.name,
        },
      };
    },
  ),
  putUser: initializer(
    {
      name: 'putUser',
      type: 'service',
      inject: ['db'],
    },
    ({ db }) =>
      Promise.resolve(({ userId }) =>
        db
          .query('users', {
            id: userId,
          })
          .then(user => ({
            status: 200,
            headers: {},
            body: {
              id: userId,
              name: user.name,
            },
          })),
      ),
  ),
};

describe('initWepApplication', () => {
  let $;

  beforeEach(() => {
    $ = new Knifecycle();
    $.register(
      constant('ENV', {
        NODE_ENV: 'development',
      }),
    );
    $.register(constant('API', API));
    $.register(
      initializer(
        {
          name: 'HANDLERS',
          type: 'service',
          inject: Object.keys(HANDLERS),
        },
        async HANDLERS => HANDLERS,
      ),
    );
    Object.keys(HANDLERS)
      .map(name => HANDLERS[name])
      .forEach($.register.bind($));
    initWepApplication($);
    $.register(constant('db', { query: sinon.stub() }));
    $.register(constant('log', sinon.stub()));
    $.register(constant('PORT', 1664));
    $.register(constant('HOST', 'localhost'));
    $.register(constant('time', sinon.stub().returns(1337)));
  });

  describe('with a few routes', () => {
    test('should work as expected', async () => {
      const { HOST, PORT, log, db, $destroy } = await $.run([
        'HOST',
        'PORT',
        'log',
        'db',
        'httpServer',
        '$destroy',
      ]);

      db.query.returns(
        Promise.resolve({
          name: 'John Doe',
        }),
      );

      await new Promise((resolve, reject) => {
        supertest(`http://${HOST}:${PORT}`)
          .get('/v1/users/1?extended=false')
          .unset('User-Agent')
          .expect(200)
          .end((err, res) => {
            if (err) {
              reject(err);
              return;
            }
            assert.deepEqual(db.query.args, [['users', { id: 1 }]]);
            assert.deepEqual(res.body, {
              id: 1,
              name: 'John Doe',
            });
            resolve($destroy());
          });
      });

      assert.deepEqual(log.args, [
        ['debug', 'Delay service initialized.'],
        ['debug', 'HTTP Transaction initialized.'],
        ['debug', 'HTTP Router initialized.'],
        ['info', 'HTTP Server listening at "http://localhost:1664".'],
        ['debug', 'Created a delay:', 30000],
        [
          'info',
          {
            endInBytes: 116,
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
            },
            resHeaders: {
              'content-type': 'application/json',
            },
            startInBytes: 116,
            startOutBytes: 0,
            startTime: 1337,
            statusCode: 200,
            url: '/v1/users/1?extended=false',
            errored: false,
          },
        ],
        ['debug', 'Cleared a delay'],
        ['debug', 'Closing HTTP server.'],
        ['debug', 'HTTP server closed'],
        ['debug', 'Cancelling pending timeouts:', 0],
      ]);
    });
  });
});
