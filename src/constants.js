'use strict';

const PassThrough = require('stream').PassThrough;

const DEFAULT_DEBUG_NODE_ENVS = ['test', 'development'];
const DEFAULT_BUFFER_LIMIT = '500kB';
const DEFAULT_PARSERS = {
  'application/json': JSON.parse.bind(JSON),
};
const DEFAULT_STRINGIFYERS = {
  'application/json': JSON.stringify.bind(JSON),
};
const DEFAULT_DECODERS = {
  'utf-8': PassThrough,
};
const DEFAULT_ENCODERS = {
  'utf-8': PassThrough,
};

module.exports = {
  DEFAULT_DEBUG_NODE_ENVS,
  DEFAULT_BUFFER_LIMIT,
  DEFAULT_PARSERS,
  DEFAULT_STRINGIFYERS,
  DEFAULT_DECODERS,
  DEFAULT_ENCODERS,
};
