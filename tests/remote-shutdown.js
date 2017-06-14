'use strict';

const sinon = require('sinon');
const { initializer } = require('knifecycle');
const {
  initWepApplication,
} = require('../src');

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
  shutdown: initializer({
    name: 'shutdown',
    type: 'service',
    inject: ['$destroy'],
  }, ({ $destroy }) => Promise.resolve(
    () => {
      setImmediate($destroy);
      return Promise.resolve({
        status: 200,
      });
    }
  )),
};

initWepApplication(API, HANDLERS)
.constant('time', sinon.stub().returns((new Date('2010-03-06')).getTime()))
.run(['ENV', 'log', 'httpServer', 'process', '$destroy'])
.then(({ ENV, log, $destroy }) => {
  log('info', 'On air 🚀🌕');
  if(ENV.DRY_RUN) {
    setImmediate($destroy);
    return;
  }
})
.catch((err) => {
  console.error('💀 - Cannot launch the process:', err.stack);
  process.exit(1);
});
