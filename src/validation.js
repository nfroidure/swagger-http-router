'use strict';

const camelCase = require('camel-case');
const HTTPError = require('yhttperror');

module.exports = {
  applyValidators,
  prepareValidators,
  filterHeaders,
};

/* Architecture Note #2.1: Validators
For performance reasons, the validators are
 created once for all at startup from the
 API definition.

One could argue that it would have been
 better for performances to generate
 the code statically. This is true. It
 may be done later but it won't change
 the way it works so, moving fast for
 now but keeping it in mind.

Also, looking closely to Prepack that
 could improve singnificantly this
 project performances with close to no
 time costs:
 https://github.com/facebook/prepack/issues/522#issuecomment-300706099
*/

function applyValidators(operation, validators, parameters) {
  (operation.parameters || []).forEach(({ name, in: isIn }) => {
    if ('header' === isIn) {
      return validators[name](parameters[camelCase(name)]);
    }
    return validators[name](parameters[name]);
  });
}

function prepareValidators(ajv, operation) {
  return (operation.parameters || []).reduce((validators, parameter) => {
    let schema;

    if (['query', 'header', 'path'].includes(parameter.in)) {
      schema = {
        type: parameter.type,
        format: parameter.format,
        pattern: parameter.pattern,
      };
    } else {
      schema = parameter.schema;
    }
    validators[parameter.name] = _validateParameter.bind(
      null,
      parameter,
      ajv.compile(schema)
    );
    return validators;
  }, {});
}

function _validateParameter(parameter, validator, value) {
  if (parameter.required && 'undefined' === typeof value) {
    throw new HTTPError(
      400,
      'E_REQUIRED_PARAMETER',
      parameter.name,
      typeof value,
      value
    );
  }
  if ('undefined' !== typeof value && !validator(value)) {
    throw new HTTPError(
      400,
      'E_BAD_PARAMETER',
      parameter.name,
      typeof value,
      value,
      validator.errors
    );
  }
}

function filterHeaders(parameters, headers) {
  return (parameters || [])
    .filter(parameter => 'header' === parameter.in)
    .reduce((filteredHeaders, parameter) => {
      if (headers[parameter.name.toLowerCase()]) {
        filteredHeaders[camelCase(parameter.name)] =
          headers[parameter.name.toLowerCase()];
      }
      return filteredHeaders;
    }, {});
}
