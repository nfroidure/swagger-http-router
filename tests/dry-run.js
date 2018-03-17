'use strict';

const { Knifecycle, initializer } = require('knifecycle');
const { initWepApplication } = require('../src');

const $ = new Knifecycle();

// eslint-disable-next-line
$.constant('debug', console.error.bind(console));
$.constant('logger', {
  // eslint-disable-next-line
  error: console.error.bind(console),
  // eslint-disable-next-line
  info: console.info.bind(console),
  // eslint-disable-next-line
  warning: console.log.bind(console),
});

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
    '/ping': {
      head: {
        operationId: 'ping',
        summary: "Checks API's availability.",
        responses: {
          200: {
            description: 'Pong',
          },
        },
      },
    },
  },
};

const HANDLERS = {
  ping: initializer(
    {
      name: 'ping',
      type: 'service',
    },
    () =>
      Promise.resolve(() => ({
        status: 200,
      }))
  ),
};

initWepApplication(API, HANDLERS, $)
  .run(['ENV', '?log', 'httpServer', 'process', '$destroy'])
  .then(({ ENV, log, $destroy }) => {
    log && log('info', 'On air 🚀🌕');
    if (ENV.DRY_RUN) {
      $destroy();
      return;
    }
  })
  .catch(err => {
    console.error('💀 - Cannot launch the process:', err.stack); // eslint-disable-line
    process.exit(1);
  });
