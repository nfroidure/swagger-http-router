'use strict';

const PassThrough = require('stream').PassThrough;
const qs = require('qs');

const DEFAULT_DEBUG_NODE_ENVS = ['test', 'development'];
const DEFAULT_BUFFER_LIMIT = '500kB';
const DEFAULT_PARSERS = {
  'application/json': content => JSON.parse(content),
  'text/plain': identity,
  'application/x-www-form-urlencoded': content => qs.parse(content),
};
const DEFAULT_STRINGIFYERS = {
  'application/json': JSON.stringify.bind(JSON),
  'text/plain': ensureString,
  'application/x-www-form-urlencoded': qs.stringify.bind(qs),
};
const DEFAULT_DECODERS = {
  'utf-8': PassThrough,
};
const DEFAULT_ENCODERS = {
  'utf-8': PassThrough,
};

function ensureString(str) {
  return 'undefined' === typeof str
    ? ''
    : 'string' === typeof str ? str : JSON.stringify(str);
}

function identity(me) {
  return me;
}

module.exports = {
  DEFAULT_DEBUG_NODE_ENVS,
  DEFAULT_BUFFER_LIMIT,
  DEFAULT_PARSERS,
  DEFAULT_STRINGIFYERS,
  DEFAULT_DECODERS,
  DEFAULT_ENCODERS,
};
