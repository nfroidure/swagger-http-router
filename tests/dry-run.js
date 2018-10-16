import Knifecycle, { initializer, constant } from 'knifecycle';
import { initWepApplication } from '../src';

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
          })),
      ),
    };

    $.register(
      constant('ENV', {
        NODE_ENV: 'development',
      }),
    );
    $.register(constant('HOST', 'localhost'));
    $.register(constant('PORT', 1337));
    $.register(constant('API', API));
    $.register(constant('HANDLERS', HANDLERS));

    initWepApplication($);

    const { log, $destroy } = await $.run([
      'log',
      'httpServer',
      'process',
      '$destroy',
    ]);

    log('info', 'On air 🚀🌕');

    await $destroy();
  } catch (err) {
    console.error('💀 - Cannot launch the process:', err.stack); // eslint-disable-line
    process.exit(1);
  }
}
