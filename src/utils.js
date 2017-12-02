'use strict';

const SwaggerParser = require('swagger-parser');

module.exports = {
  flattenSwagger,
  getSwaggerOperations,
};

/**
 * Flatten the inputed Swagger file
 *  object
 * @param  {Object} API
 * An Object containing a parser Swagger JSON
 * @return {Object}
 * The flattened Swagger definition
 */
function flattenSwagger(API) {
  const parser = new SwaggerParser();

  return parser.dereference(API);
}

/**
 * Return a Swagger operation in a more
 *  convenient way to iterate onto its
 *  operations
 * @param  {Object} API
 * The flattened Swagger defition
 * @return {Array}
 * An array of all the Swagger operations
 * @example
 * getSwaggerOperations(API)
 * .map((operation) => {
 *    const { path, method, operationId, parameters } = operation;
 *
 *   // Do something with that operation
 * });
 */
function getSwaggerOperations(API) {
  return Object.keys(API.paths).reduce(
    (operations, path) =>
      Object.keys(API.paths[path]).reduce(
        (operations, method) =>
          operations.concat(
            Object.assign(
              {},
              {
                path,
                method,
              },
              API.paths[path][method]
            )
          ),
        operations
      ),
    []
  );
}
