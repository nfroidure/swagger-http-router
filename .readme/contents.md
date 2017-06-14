Why write code when you have a Swagger/OpenAPI definition?

By taking part of the Swagger/OpenAPI standard and
 dependency injection  patterns, `swagger-http-router`
 provides a convenient, highly modular and easily
 testable REST tool.

## Usage
```js
import initDB from './services/db';
import {
  initWepApplication
} from 'swagger-http-router';

import API from './swagger.api.json';
import * as HANDLERS from './handlers';

// STEP 1: Spawn a Knifecycle instance and attach
// it the API definition and its handlers
const $ = initWepApplication(API, HANDLERS);

// STEP 2: Register additional services
// Override the build in `uniqueId` service
// with the UUID v4 function
$.constant('uniqueId', uuid.v4)
// Provide the process environment
.constant('ENV', process.env)
// Register the database initializer
.register(initDB);

// STEP 3: Run your app!
// Run the execution silo that encapsulates the app
// Note that the `httpServer` and `process` services
// are injected for their respective side effects:
// creating the server and managing the process
// lifecycle
$.run(['ENV', 'log', 'httpServer', 'process', '$destroy'])
.then(({ ENV, log, $destroy }) => {
  log('info', `On air 🚀🌕`);
  if(ENV.DRY_RUN) {
    return $destroy();
  }
})
.catch((err) => {
  console.error('💀 - Cannot launch the process:', err.stack);
  process.exit(1);
});
```

In order to work, your Swagger definition endpoints
must provide an
 [`operationId`](http://swagger.io/specification/#operationObject).
 This is how the router figures out which handler
 to run. Those ids have to be unique. Here is
 a sample Swagger definition you could use as is:
```js
// file: ./my-swagger.json
{
  "host": "localhost:1337",
  "basePath": "/v1",
  "schemes": ["http"],
  // (...)
  "paths": {
    "GET": {
      "/users/{userId}": {
        "operationId": "getUser",
        "summary": "Retrieve a user.",
        "produces": [
          "application/json"
        ],
        "parameters": [{
          "in": "path",
          "name": "userId",
          "type": "number",
          "pattern": "^[0-9]+$"
        }, {
          "in": "query",
          "name": "extended",
          "type": "boolean"
        }, {
          "in": "header",
          "name": "Content-Type",
          "type": "string"
        }],
        "responses": {
          "200": {
            "description": "User found",
            "schema": {
              "type": "object",
              "properties": {
                "id": { "type": "number" },
                "name": { "type": "string" }
              }
            }
          },
          "404": {
            "description": "User not found"
          }
        }
      }
    }
  }
}
```

To bring to the router the logic that each
 endpoint implements, you have to create
 handlers for each `operationId`:
```js
// file: ./handlers.js

// Knifecycle is the dependency injection tool
// we use. It provides decorators to declare
// which dependencies to inject in your handlers
import { initializer } from 'knifecycle/dist/util';

@initializer({
  name: 'getUser',
  type: 'service',
  inject: ['db'],
})
export async function getUser({ db }) {
  return ({ userId }) =>
    db.query('users', {
      id: userId,
    })
    .then(user => ({
      status: 200,
      headers: {},
      body: {
        id: userId,
        name: user.name,
      }
    }));
}

```

As you can see, handlers are just asynchronous functions
that takes the request parameters in input and provide
a JSON serializable response in output.

This router is designed to be used with a DI system and
 is particularly useful with
 [`knifecycle`](https://github.com/nfroidure/knifecycle).

That said, you could completely avoid using a DI system
 by simply using the initializers as functions and handle
 their initialization manually. See this
  [alternate example](https://gist.github.com/nfroidure/647189bdeffef33bced3a3b6d924640e).

## Goal

This router is just my way to do things. It is nice
 if you use it and I'd be happy if you improve it.

To be honest, I think this is a better approach but I do
 not want to spend energy and fight with giants to make
 this a standard approach. It means that it will probably
 never be the next hype and if you use it you must feel
 confident with forking and maintaining it yourself.
 That said, the code is well documented and not that hard.
 Also, the handlers you will end with will be easily
 reusable in any framework with little to no changes.

You may wonder why I found that I'd better write
 my own router instead of using current solutions
 like `ExpressJS` or `HapiJS`:
- I want documentation first APIs. No documentation, no
 web service.
- I want my code to be clear and descriptive instead of
 binded to some cryptic middleware or plugin defined
 elsewhere. Here are some
 [thoughts on middlewares](http://insertafter.com/en/blog/no_more_middlewares.html)
 that explain this statement in more depth.
 - I want easily testable and reusable handlers just
  returning plain JSON. To be able to reuse it in
  multiple situations: a lambda/serverless back-end,
  when rendering server side React views or in my
  GraphQL server resolvers.
- I prefer functional programming: it just makes my code
 better. There are too many encapsulated states in existing
 frameworks. I just want my handlers to be pure and
 composable. For example, why adding a CORS middleware or
 plugin when you can just compose handlers?
```js
import { reuseSpecialProps } from 'knifecycle/dist/util';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Keep-Alive,User-Agent',
};

export function wrapWithCORS(initHandler) {
  // `reuseSpecialProps` create a new initializer
  // with the original initializer properties
  // applyed on it.
  return reuseSpecialProps(
    initHandler,
    initHandlerWithCORS.bind(null, initHandler)
  );
}

// This function is the actual initializer that
// wraps the handler initializer. It is executed
// once at startup.
async function initHandlerWithCORS(initHandler, services) => {
  const handler = await initHandler(services);

  return handleWithCors.bind(null, handler);
}

// And finally this one applies CORS to the
// response
async function handleWithCors(handler, parameters) {
  const response = await handler(parameters);

  return  {
    ...response,
    headers: {
      ...response.headers,
      ...CORS,
    }
  };
}

```
- and finally, I want to be able to instrument my code
 without having to do ugly hacks. This is why DI and
 Inversion of Control are at the core of my way to
 handle web services.

You may want to have a look at the
 [architecture notes](./ARCHITECTURE.md) of this module
 to better grasp how it is built.

## Recommendations

The above usage section shows you a very basic
 usage of this router. For larger apps:
- you may want to build you Swagger file to avoid
 repeating yourself. It won't change anything for
 `swagger-http-router` since it just assumes a
 Swagger file.
- you will probably end up by automating the
 handlers loading with a configuration file.
 At that point, the DI system will become very
 handy.
- you will certainly need some more services
 to make your app work. Please double check if
 one exists before creating your own. Also,
 handlers can be reused so feel free to
 publish yours and add your Swagger path
 objects to them in order for your users to
 add them to their own Swagger build.
