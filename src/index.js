import { getInstance, initializer } from 'knifecycle';
import {
  initLogService,
  initTimeService,
  initRandomService,
  initDelayService,
  initProcessService,
} from 'common-services';

import initHTTPRouter from './router';
import initHTTPTransaction from './transaction';
import initHTTPServer from './server';
import initErrorHandler from './errorHandler';

/* Architecture Note #1: Principles

The `swagger-http-router` projects aims to make
 creating well documented and highly customizable
 REST APIs a breeze.

By relying on the
 [Swagger/OpenAPI format](https://www.openapis.org/)
 to declare a new endpoint, this project forces
 documentation before code.

It also is highly customizable since based
 on the dependency injection with inversion of
 control pattern allowing you to override or
 wrap its main constituents.

![Architecture Overview](./overview.svg.png)

The HTTP transaction flow is very simple.
 First, we have a HTTPServer that handles
 requests an serve responses (the
 `httpServer` service). Then, the
 `httpTransaction` transform the NodeJS
 requests into raw serialazable ones
 (raw objects with no methods nor
 internal states).

 Then the router (`httpRouter`) deal with
 that request to test which handler need
 to be run by comparing the method/path
 couple with the Swagger/OpenAPI operations
 declarations.

 Once found, it simply runs the right
  handler with the Swagger/OpenAPI
  parameters value filled from the
  serializable request. The handler
  simply have to return a serializable
  response object in turn.

  If any error occurs within
  this process, than the `errorHandler`
  is responsible for providing the now
  lacking response object based on the
  error it catch. And that's it, you
  have your REST API.

  We have [no middleware](http://insertafter.com/en/blog/no_more_middlewares.html)
  concept here. Instead, every handler
  is a simple function taking an object
  and returning another one. It makes
  those objects very easily composable
  (in a functional programming sense).

  You may add global wrappers to
  change every handlers input/output
  on the fly or add a local wrapper
  specifically to one of a few
  handlers.
*/

export {
  initHTTPRouter,
  initHTTPTransaction,
  initHTTPServer,
  initErrorHandler,
};

/**
 * Initialize a web application
 * @param  {Object}      API
 * The Swagger definition of the we application
 * @param  {Object}      HANDLERS
 * The handlers for each operations defined by the
 *  Swagger definition.
 * @param  {Knifecycle}  [$=getInstance(]
 * A Knifecycle instance on which to set the application
 *  up.
 * @return {Knifecycle}
 * The passed in Knifecycle instance or the one created
 *  by default.
 */
export function initWepApplication(API, HANDLERS, $ = getInstance()) {
  [
    initLogService,
    initTimeService,
    initRandomService,
    initDelayService,
    initProcessService,
    initHTTPRouter,
    initHTTPTransaction,
    initErrorHandler,
    initHTTPServer,
  ].forEach($.register.bind($));

  registerHandlers($, HANDLERS);

  $.constant(
    'ENV',
    Object.assign(
      {
        NODE_ENV: 'development',
        HOST: API.host.split(':')[0],
        PORT: API.host.split(':')[1] || 80,
      },
      process.env,
    ),
  );
  $.constant('exit', process.exit);
  $.constant('API', API);

  return $;
}

/**
 * Register the handlers hash into the given Knifecycle
 *  instance
 * @param  {Knifecycle}    $
 * The Knifecycle instance on which to set up the handlers
 * @param  {Object}        HANDLERS
 * The handlers hash
 * @return {void}
 */
export function registerHandlers($, HANDLERS) {
  Object.keys(HANDLERS).forEach(handlerName => {
    $.register(HANDLERS[handlerName]);
  });

  $.register(
    initializer(
      {
        name: 'HANDLERS',
        type: 'service',
        inject: Object.keys(HANDLERS),
      },
      handlers => Promise.resolve(handlers),
    ),
  );
}
