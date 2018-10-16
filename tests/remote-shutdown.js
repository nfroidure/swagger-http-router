import Knifecycle, { initializer, constant } from 'knifecycle';
import { initWepApplication } from '../src';
import sinon from 'sinon';

run();

async function run() {
  try {
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
            operationId: 'postShutdown',
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

    $.register(
      initializer(
        {
          name: 'postShutdown',
          type: 'service',
          inject: ['$destroy'],
        },
        async ({ $destroy }) => async () => {
          setImmediate($destroy);
          return {
            status: 200,
          };
        },
      ),
    );
    $.register(
      initializer(
        {
          name: 'HANDLERS',
          type: 'service',
          inject: ['postShutdown'],
        },
        async HANDLERS => HANDLERS,
      ),
    );
    $.register(
      constant('ENV', {
        NODE_ENV: 'development',
      }),
    );
    $.register(constant('HOST', 'localhost'));
    $.register(constant('PORT', 1338));
    $.register(constant('API', API));
    $.register(
      constant('time', sinon.stub().returns(new Date('2010-03-06').getTime())),
    );

    initWepApplication($);

    const { log } = await $.run([
      'ENV',
      'log',
      'httpServer',
      'process',
      '$destroy',
    ]);

    log('info', 'On air 🚀🌕');
  } catch (err) {
    console.error('💀 - Cannot launch the process:', err.stack); // eslint-disable-line
    process.exit(1);
  }
}
