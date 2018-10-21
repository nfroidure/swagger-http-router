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
| services.MAX_HEADERS_COUNT | <code>Object</code> |  | The https://nodejs.org/api/http.html#http_server_maxheaderscount |
| services.KEEP_ALIVE_TIMEOUT | <code>Object</code> |  | See https://nodejs.org/api/http.html#http_server_keepalivetimeout |
| services.MAX_CONNECTIONS | <code>Object</code> |  | See https://nodejs.org/api/net.html#net_server_maxconnections |
| services.TIMEOUT | <code>Object</code> |  | See https://nodejs.org/api/http.html#http_server_timeout |
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
