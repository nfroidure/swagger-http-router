[//]: # ( )
[//]: # (This file is automatically generated by a `metapak`)
[//]: # (module. Do not change it  except between the)
[//]: # (`content:start/end` flags, your changes would)
[//]: # (be overridden.)
[//]: # ( )
# swagger-http-router
> A HTTP router based on your Swagger/OpenAPI definition.

[![NPM version](https://badge.fury.io/js/swagger-http-router.svg)](https://npmjs.org/package/swagger-http-router)
[![Build status](https://secure.travis-ci.org/nfroidure/swagger-http-router.svg)](https://travis-ci.org/nfroidure/swagger-http-router)
[![Dependency Status](https://david-dm.org/nfroidure/swagger-http-router.svg)](https://david-dm.org/nfroidure/swagger-http-router)
[![devDependency Status](https://david-dm.org/nfroidure/swagger-http-router/dev-status.svg)](https://david-dm.org/nfroidure/swagger-http-router#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/nfroidure/swagger-http-router/badge.svg?branch=master)](https://coveralls.io/r/nfroidure/swagger-http-router?branch=master)
[![Code Climate](https://codeclimate.com/github/nfroidure/swagger-http-router.svg)](https://codeclimate.com/github/nfroidure/swagger-http-router)
[![Dependency Status](https://dependencyci.com/github/nfroidure/swagger-http-router/badge)](https://dependencyci.com/github/nfroidure/swagger-http-router)


[//]: # (::contents:start)

Why write code when you have a Swagger/OpenAPI definition?

By taking part of the Swagger/OpenAPI standard and
 dependency injection  patterns, `swagger-http-router`
 provides a convenient, highly modular and easily
 testable REST tool.

## Usage
```js
import { constant } from 'knifecycle';
import initDB from './services/db';
import {
  initWepApplication
} from 'swagger-http-router';

import API from './swagger.api.json';
import * as HANDLERS from './handlers';

run();

async function run() {
  try {
    // STEP 1: Spawn a Knifecycle instance and attach
    // it the API definition and its handlers
    const $ = initWepApplication(API, HANDLERS);

    // STEP 2: Register additional services
    // Override the build in `uniqueId` service
    // with the UUID v4 function
    $.register(constant('uniqueId', uuid.v4))
    // Provide the process environment
    .register(constant('ENV', process.env))
    // Register the database initializer
    .register(initDB);

    // STEP 3: Run your app!
    // Run the execution silo that encapsulates the app
    // Note that the `httpServer` and `process` services
    // are injected for their respective side effects:
    // creating the server and managing the process
    // lifecycle
    const { ENV, log, $destroy } = await $.run(['ENV', 'log', 'httpServer', 'process', '$destroy']);

    log('info', `On air 🚀🌕`);

    if(ENV.DRY_RUN) {
      await $destroy();
    }
  } catch(err) {
    console.error('💀 - Cannot launch the process:', err.stack);
    process.exit(1);
  }
)
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

export default initializer(
  {
    name: 'getUser',
    type: 'service',
    inject: ['db'],
  },
  getUser
);

async function getUser({ db }) {
  return async ({ userId }) => {
    const user = await db.query('users', {
      id: userId,
    });

    return {
      status: 200,
      headers: {},
      body: {
        id: userId,
        name: user.name,
      }
    };
  }
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

# API
## Functions

<dl>
<dt><a href="#initErrorHandler">initErrorHandler(services)</a> ⇒ <code>Promise</code></dt>
<dd><p>Initialize an error handler for the
HTTP router</p>
</dd>
<dt><a href="#initWepApplication">initWepApplication(API, HANDLERS, [$])</a> ⇒ <code>Knifecycle</code></dt>
<dd><p>Initialize a web application</p>
</dd>
<dt><a href="#registerHandlers">registerHandlers($, HANDLERS)</a> ⇒ <code>void</code></dt>
<dd><p>Register the handlers hash into the given Knifecycle
 instance</p>
</dd>
<dt><a href="#initHTTPRouter">initHTTPRouter(services)</a> ⇒ <code>Promise</code></dt>
<dd><p>Initialize an HTTP router</p>
</dd>
<dt><a href="#initHTTPServer">initHTTPServer(services)</a> ⇒ <code>Promise</code></dt>
<dd><p>Initialize an HTTP server</p>
</dd>
<dt><a href="#initHTTPTransaction">initHTTPTransaction(services)</a> ⇒ <code>Promise.&lt;function()&gt;</code></dt>
<dd><p>Instantiate the httpTransaction service</p>
</dd>
<dt><a href="#flattenSwagger">flattenSwagger(API)</a> ⇒ <code>Object</code></dt>
<dd><p>Flatten the inputed Swagger file
 object</p>
</dd>
<dt><a href="#getSwaggerOperations">getSwaggerOperations(API)</a> ⇒ <code>Array</code></dt>
<dd><p>Return a Swagger operation in a more
 convenient way to iterate onto its
 operations</p>
</dd>
</dl>

<a name="initErrorHandler"></a>

## initErrorHandler(services) ⇒ <code>Promise</code>
Initialize an error handler for the
HTTP router

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise of a function to handle errors  

| Param | Type | Description |
| --- | --- | --- |
| services | <code>Object</code> | The services the server depends on |
| [services.ENV] | <code>Object</code> | The services the server depends on |
| [services.DEBUG_NODE_ENVS] | <code>Array</code> | The environnement that activate debugging  (prints stack trace in HTTP errors responses) |
| [services.STRINGIFYERS] | <code>Object</code> | The synchronous body stringifyers |

<a name="initErrorHandler..errorHandler"></a>

### initErrorHandler~errorHandler(transactionId, responseSpec, err) ⇒ <code>Promise</code>
Handle an HTTP transaction error an
map it to a serializable response

**Kind**: inner method of [<code>initErrorHandler</code>](#initErrorHandler)  
**Returns**: <code>Promise</code> - A promise resolving when the operation
 completes  

| Param | Type | Description |
| --- | --- | --- |
| transactionId | <code>String</code> | A raw NodeJS HTTP incoming message |
| responseSpec | <code>Object</code> | The response specification |
| err | <code>HTTPError</code> | The encountered error |

<a name="initWepApplication"></a>

## initWepApplication(API, HANDLERS, [$]) ⇒ <code>Knifecycle</code>
Initialize a web application

**Kind**: global function  
**Returns**: <code>Knifecycle</code> - The passed in Knifecycle instance or the one created
 by default.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| API | <code>Object</code> |  | The Swagger definition of the we application |
| HANDLERS | <code>Object</code> |  | The handlers for each operations defined by the  Swagger definition. |
| [$] | <code>Knifecycle</code> | <code>getInstance(</code> | A Knifecycle instance on which to set the application  up. |

<a name="registerHandlers"></a>

## registerHandlers($, HANDLERS) ⇒ <code>void</code>
Register the handlers hash into the given Knifecycle
 instance

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| $ | <code>Knifecycle</code> | The Knifecycle instance on which to set up the handlers |
| HANDLERS | <code>Object</code> | The handlers hash |

<a name="initHTTPRouter"></a>

## initHTTPRouter(services) ⇒ <code>Promise</code>
Initialize an HTTP router

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise of a function to handle HTTP requests.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| services | <code>Object</code> |  | The services the server depends on |
| services.API | <code>Object</code> |  | The Swagger definition of the API |
| services.HANDLERS | <code>Object</code> |  | The handlers for the operations decribe  by the Swagger API definition |
| [services.ENV] | <code>Object</code> |  | The services the server depends on |
| [services.DEBUG_NODE_ENVS] | <code>Array</code> |  | The environnement that activate debugging  (prints stack trace in HTTP errors responses) |
| [services.BUFFER_LIMIT] | <code>String</code> |  | The maximum bufferisation before parsing the  request body |
| [services.PARSERS] | <code>Object</code> |  | The synchronous body parsers (for operations  that defines a request body schema) |
| [services.STRINGIFYERS] | <code>Object</code> |  | The synchronous body stringifyers (for  operations that defines a response body  schema) |
| [services.log] | <code>function</code> | <code>noop</code> | A logging function |
| services.httpTransaction | <code>function</code> |  | A function to create a new HTTP transaction |

<a name="initHTTPServer"></a>

## initHTTPServer(services) ⇒ <code>Promise</code>
Initialize an HTTP server

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise of an object with a NodeJS HTTP server
 in its `service` property.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| services | <code>Object</code> |  | The services the server depends on |
| services.ENV | <code>Object</code> |  | The process environment variables |
| services.httpRouter | <code>function</code> |  | The function to run with the req/res tuple |
| [services.log] | <code>function</code> | <code>noop</code> | A logging function |

<a name="initHTTPTransaction"></a>

## initHTTPTransaction(services) ⇒ <code>Promise.&lt;function()&gt;</code>
Instantiate the httpTransaction service

**Kind**: global function  
**Returns**: <code>Promise.&lt;function()&gt;</code> - A promise of the httpTransaction function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| services | <code>Object</code> |  | The services to inject |
| [services.TIMEOUT] | <code>Number</code> | <code>30000</code> | A number indicating how many ms the transaction  should take to complete before being cancelled. |
| [services.TRANSACTIONS] | <code>Object</code> | <code>{}</code> | A hash of every current transactions |
| services.time | <code>function</code> |  | A timing function |
| services.delay | <code>Object</code> |  | A delaying service |
| [services.log] | <code>function</code> |  | A logging function |
| [services.uniqueId] | <code>function</code> |  | A function returning unique identifiers |

**Example**  
```js
import { initHTTPTransaction } from 'swagger-http-router';

const httpTransaction = await initHTTPTransaction({
  log: console.log.bind(console),
  time: Date.now.bind(Date),
});
```
<a name="initHTTPTransaction..httpTransaction"></a>

### initHTTPTransaction~httpTransaction(req, res) ⇒ <code>Array</code>
Create a new HTTP transaction

**Kind**: inner method of [<code>initHTTPTransaction</code>](#initHTTPTransaction)  
**Returns**: <code>Array</code> - The normalized request and the HTTP
transaction created in an array.  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>HTTPRequest</code> | A raw NodeJS HTTP incoming message |
| res | <code>HTTPResponse</code> | A raw NodeJS HTTP response |

<a name="flattenSwagger"></a>

## flattenSwagger(API) ⇒ <code>Object</code>
Flatten the inputed Swagger file
 object

**Kind**: global function  
**Returns**: <code>Object</code> - The flattened Swagger definition  

| Param | Type | Description |
| --- | --- | --- |
| API | <code>Object</code> | An Object containing a parser Swagger JSON |

<a name="getSwaggerOperations"></a>

## getSwaggerOperations(API) ⇒ <code>Array</code>
Return a Swagger operation in a more
 convenient way to iterate onto its
 operations

**Kind**: global function  
**Returns**: <code>Array</code> - An array of all the Swagger operations  

| Param | Type | Description |
| --- | --- | --- |
| API | <code>Object</code> | The flattened Swagger defition |

**Example**  
```js
getSwaggerOperations(API)
.map((operation) => {
   const { path, method, operationId, parameters } = operation;

  // Do something with that operation
});
```

[//]: # (::contents:end)

# API
## Functions

<dl>
<dt><a href="#initErrorHandler">initErrorHandler(services)</a> ⇒ <code>Promise</code></dt>
<dd><p>Initialize an error handler for the
HTTP router</p>
</dd>
<dt><a href="#initWepApplication">initWepApplication(API, HANDLERS, [$])</a> ⇒ <code>Knifecycle</code></dt>
<dd><p>Initialize a web application</p>
</dd>
<dt><a href="#initHTTPRouter">initHTTPRouter(services)</a> ⇒ <code>Promise</code></dt>
<dd><p>Initialize an HTTP router</p>
</dd>
<dt><a href="#initHTTPServer">initHTTPServer(services)</a> ⇒ <code>Promise</code></dt>
<dd><p>Initialize an HTTP server</p>
</dd>
<dt><a href="#initHTTPTransaction">initHTTPTransaction(services)</a> ⇒ <code>Promise.&lt;function()&gt;</code></dt>
<dd><p>Instantiate the httpTransaction service</p>
</dd>
<dt><a href="#flattenSwagger">flattenSwagger(API)</a> ⇒ <code>Object</code></dt>
<dd><p>Flatten the inputed Swagger file
 object</p>
</dd>
<dt><a href="#getSwaggerOperations">getSwaggerOperations(API)</a> ⇒ <code>Array</code></dt>
<dd><p>Return a Swagger operation in a more
 convenient way to iterate onto its
 operations</p>
</dd>
</dl>

<a name="initErrorHandler"></a>

## initErrorHandler(services) ⇒ <code>Promise</code>
Initialize an error handler for the
HTTP router

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise of a function to handle errors  

| Param | Type | Description |
| --- | --- | --- |
| services | <code>Object</code> | The services the server depends on |
| [services.ENV] | <code>Object</code> | The services the server depends on |
| [services.DEBUG_NODE_ENVS] | <code>Array</code> | The environnement that activate debugging  (prints stack trace in HTTP errors responses) |
| [services.STRINGIFYERS] | <code>Object</code> | The synchronous body stringifyers |

<a name="initErrorHandler..errorHandler"></a>

### initErrorHandler~errorHandler(transactionId, responseSpec, err) ⇒ <code>Promise</code>
Handle an HTTP transaction error and
map it to a serializable response

**Kind**: inner method of [<code>initErrorHandler</code>](#initErrorHandler)  
**Returns**: <code>Promise</code> - A promise resolving when the operation
 completes  

| Param | Type | Description |
| --- | --- | --- |
| transactionId | <code>String</code> | A raw NodeJS HTTP incoming message |
| responseSpec | <code>Object</code> | The response specification |
| err | <code>HTTPError</code> | The encountered error |

<a name="initWepApplication"></a>

## initWepApplication(API, HANDLERS, [$]) ⇒ <code>Knifecycle</code>
Initialize a web application

**Kind**: global function  
**Returns**: <code>Knifecycle</code> - The passed in Knifecycle instance or the one created
 by default.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| API | <code>Object</code> |  | The Swagger definition of the we application |
| HANDLERS | <code>Object</code> |  | The handlers for each operations defined by the  Swagger definition. |
| [$] | <code>Knifecycle</code> | <code>getInstance(</code> | A Knifecycle instance on which to set the application  up. |

<a name="initHTTPRouter"></a>

## initHTTPRouter(services) ⇒ <code>Promise</code>
Initialize an HTTP router

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise of a function to handle HTTP requests.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| services | <code>Object</code> |  | The services the server depends on |
| services.API | <code>Object</code> |  | The Swagger definition of the API |
| services.HANDLERS | <code>Object</code> |  | The handlers for the operations decribe  by the Swagger API definition |
| [services.ENV] | <code>Object</code> |  | The services the server depends on |
| [services.DEBUG_NODE_ENVS] | <code>Array</code> |  | The environnement that activate debugging  (prints stack trace in HTTP errors responses) |
| [services.BUFFER_LIMIT] | <code>String</code> |  | The maximum bufferisation before parsing the  request body |
| [services.PARSERS] | <code>Object</code> |  | The synchronous body parsers (for operations  that defines a request body schema) |
| [services.STRINGIFYERS] | <code>Object</code> |  | The synchronous body stringifyers (for  operations that defines a response body  schema) |
| [services.ENCODERS] | <code>Object</code> |  | A map of encoder stream constructors |
| [services.DECODERS] | <code>Object</code> |  | A map of decoder stream constructors |
| [services.QUERY_PARSER] | <code>Object</code> |  | A query parser with the `strict-qs` signature |
| [services.log] | <code>function</code> | <code>noop</code> | A logging function |
| services.httpTransaction | <code>function</code> |  | A function to create a new HTTP transaction |

<a name="initHTTPServer"></a>

## initHTTPServer(services) ⇒ <code>Promise</code>
Initialize an HTTP server

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise of an object with a NodeJS HTTP server
 in its `service` property.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| services | <code>Object</code> |  | The services the server depends on |
| services.ENV | <code>Object</code> |  | The process environment variables |
| services.HOST | <code>Object</code> |  | The server host |
| services.PORT | <code>Object</code> |  | The server port |
| services.httpRouter | <code>function</code> |  | The function to run with the req/res tuple |
| [services.log] | <code>function</code> | <code>noop</code> | A logging function |

<a name="initHTTPTransaction"></a>

## initHTTPTransaction(services) ⇒ <code>Promise.&lt;function()&gt;</code>
Instantiate the httpTransaction service

**Kind**: global function  
**Returns**: <code>Promise.&lt;function()&gt;</code> - A promise of the httpTransaction function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| services | <code>Object</code> |  | The services to inject |
| [services.TIMEOUT] | <code>Number</code> | <code>30000</code> | A number indicating how many ms the transaction  should take to complete before being cancelled. |
| [services.TRANSACTIONS] | <code>Object</code> | <code>{}</code> | A hash of every current transactions |
| services.time | <code>function</code> |  | A timing function |
| services.delay | <code>Object</code> |  | A delaying service |
| [services.log] | <code>function</code> |  | A logging function |
| [services.uniqueId] | <code>function</code> |  | A function returning unique identifiers |

**Example**  
```js
import { initHTTPTransaction } from 'swagger-http-router';

const httpTransaction = await initHTTPTransaction({
  log: console.log.bind(console),
  time: Date.now.bind(Date),
});
```
<a name="initHTTPTransaction..httpTransaction"></a>

### initHTTPTransaction~httpTransaction(req, res) ⇒ <code>Array</code>
Create a new HTTP transaction

**Kind**: inner method of [<code>initHTTPTransaction</code>](#initHTTPTransaction)  
**Returns**: <code>Array</code> - The normalized request and the HTTP
transaction created in an array.  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>HTTPRequest</code> | A raw NodeJS HTTP incoming message |
| res | <code>HTTPResponse</code> | A raw NodeJS HTTP response |

<a name="flattenSwagger"></a>

## flattenSwagger(API) ⇒ <code>Object</code>
Flatten the inputed Swagger file
 object

**Kind**: global function  
**Returns**: <code>Object</code> - The flattened Swagger definition  

| Param | Type | Description |
| --- | --- | --- |
| API | <code>Object</code> | An Object containing a parser Swagger JSON |

<a name="getSwaggerOperations"></a>

## getSwaggerOperations(API) ⇒ <code>Array</code>
Return a Swagger operation in a more
 convenient way to iterate onto its
 operations

**Kind**: global function  
**Returns**: <code>Array</code> - An array of all the Swagger operations  

| Param | Type | Description |
| --- | --- | --- |
| API | <code>Object</code> | The flattened Swagger defition |

**Example**  
```js
getSwaggerOperations(API)
.map((operation) => {
   const { path, method, operationId, parameters } = operation;

  // Do something with that operation
});
```

# License
[MIT](https://github.com/nfroidure/swagger-http-router/blob/master/LICENSE)
