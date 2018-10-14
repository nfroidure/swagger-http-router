import Knifecycle, { initializer, constant } from 'knifecycle';
import { initWepApplication } from '../src';
import sinon from 'sinon';

const $ = new Knifecycle();

// eslint-disable-next-line
$.register(constant('debug', console.error.bind(console)));
$.register(
  constant('logger', {
    // eslint-disable-next-line
    error: console.error.bind(console),
    // eslint-disable-next-line
    info: console.info.bind(console),
    // eslint-disable-next-line
    warning: console.log.bind(console),
  }),
);

const API = {
  host: 'localhost:1337',
  swagger: '2.0',
  info: {
    version: '1.0.0',
    title: 'Sample Swagger',
    description: 'A sample Swagger file for testing purpose.',
  },
  basePath: '/v1',
  schemes: ['http'],
  paths: {
    '/shutdown': {
      post: {
        operationId: 'shutdown',
        summary: 'Shut the API down remotely.',
        responses: {
          200: {
            description: 'Shutting down...',
          },
        },
      },
    },
  },
};

const HANDLERS = {
  shutdown: initializer(
    {
      name: 'shutdown',
      type: 'service',
      inject: ['$destroy'],
    },
    ({ $destroy }) =>
      Promise.resolve(() => {
        setImmediate($destroy);
        return Promise.resolve({
          status: 200,
        });
      }),
  ),
};

initWepApplication(API, HANDLERS, $)
  .register(
    constant('time', sinon.stub().returns(new Date('2010-03-06').getTime())),
  )
  .run(['ENV', 'log', 'httpServer', 'process', '$destroy'])
  .then(({ ENV, log, $destroy }) => {
    log('info', 'On air 🚀🌕');
    if (ENV.DRY_RUN) {
      setImmediate($destroy);
      return;
    }
  })
  .catch(err => {
    console.error('💀 - Cannot launch the process:', err.stack); // eslint-disable-line
    process.exit(1);
  });
