'use strict';

const { getInstance, initializer } = require('knifecycle');
const {
  initLogService,
  initTimeService,
  initRandomService,
  initDelayService,
  initProcessService,
} = require('common-services');

const initHTTPRouter = require('./router');
const initHTTPTransaction = require('./transaction');
const initHTTPServer = require('./server');
const initErrorHandler = require('./errorHandler');

module.exports = {
  initHTTPRouter,
  initHTTPTransaction,
  initHTTPServer,
  initErrorHandler,
  initWepApplication,
  registerHandlers,
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
function initWepApplication(API, HANDLERS, $ = getInstance()) {
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

  $.constant('ENV', Object.assign({
    NODE_ENV: 'development',
    HOST: API.host.split(':')[0],
    PORT: API.host.split(':')[1] || 80,
  }, process.env));
  $.constant('exit', process.exit);
  $.constant('API', API);
  $.constant('logger', {
    debug: console.error.bind(console), // eslint-disable-line
    error: console.error.bind(console), // eslint-disable-line
    info: console.info.bind(console), // eslint-disable-line
    warning: console.log.bind(console), // eslint-disable-line
  });

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
function registerHandlers($, HANDLERS) {
  Object.keys(HANDLERS).forEach((handlerName) => {
    $.register(HANDLERS[handlerName]);
  });

  $.register(initializer({
    name: 'HANDLERS',
    type: 'service',
    inject: Object.keys(HANDLERS),
  }, handlers => Promise.resolve(handlers)));
}
