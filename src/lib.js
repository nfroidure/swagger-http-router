'use strict';

const HTTPError = require('yhttperror');
const { parse: parseContentType } = require('content-type');
const preferredCharsets = require('negotiator/lib/charset');
const preferredMediaType = require('negotiator/lib/encoding');

module.exports = {
  extractBodySpec,
  checkBodyCharset,
  checkBodyMediaType,
  extractResponseSpec,
  checkResponseCharset,
  checkResponseMediaType,
  executeHandler,
};

function extractBodySpec(
  request,
  consumableMediaTypes,
  consumableCharsets
) {
  const bodySpec = {
    contentType: '',
    contentLength: request.headers['content-length'] ?
    Number(request.headers['content-length']) :
    0,
    charset: 'utf-8',
  };

  if(request.headers['content-type']) {
    try {
      const parsedContentType = parseContentType(request.headers['content-type']);

      bodySpec.contentType = parsedContentType.type;
      if(
        parsedContentType.parameters &&
        parsedContentType.parameters.charset
      ) {
        bodySpec.charset = parsedContentType.parameters.charset.toLowerCase();
      }
    } catch (err) {
      throw new HTTPError(400, 'E_BAD_CONTENT_TYPE');
    }
  }

  checkBodyCharset(bodySpec, consumableCharsets);
  checkBodyMediaType(bodySpec, consumableMediaTypes);

  return bodySpec;
}

function checkBodyCharset(bodySpec, consumableCharsets) {
  if(
    bodySpec.contentLength &&
    bodySpec.charset &&
    !consumableCharsets
      .includes(bodySpec.charset)
  ) {
    throw new HTTPError(
      406,
      'E_UNSUPPORTED_CHARSET',
      bodySpec.charset,
      consumableCharsets
    );
  }
}

function checkBodyMediaType(bodySpec, consumableMediaTypes) {
  if(
    bodySpec.contentLength &&
    bodySpec.contentType &&
    !consumableMediaTypes
      .includes(bodySpec.contentType)
  ) {
    throw new HTTPError(
      415,
      'E_UNSUPPORTED_MEDIA_TYPE',
      bodySpec.contentType,
      consumableMediaTypes
    );
  }
}

function extractResponseSpec(operation, request, supportedMediaTypes, supportedCharsets) {
  const accept = request.headers.accept || '*';
  const responseSpec = {
    charsets: request.headers['accept-charset'] ?
      preferredCharsets(
        request.headers['accept-charset'],
        supportedCharsets
      ) :
      supportedCharsets,
    contentTypes: preferredMediaType(
      accept.replace(/(^|,)\*\/\*($|,|;)/g, '$1*$2'),
      supportedMediaTypes
    ),
  };

  return responseSpec;
}

function checkResponseMediaType(request, responseSpec, produceableMediaTypes) {
  if(0 === responseSpec.contentTypes.length) {
    throw new HTTPError(
      406,
      'E_UNACCEPTABLE_MEDIA_TYPE',
      request.headers.accept,
      produceableMediaTypes
    );
  }
}

function checkResponseCharset(request, responseSpec, produceableCharsets) {
  if(0 === responseSpec.charsets.length) {
    throw new HTTPError(
      406,
      'E_UNACCEPTABLE_CHARSET',
      request.headers['accept-charset'],
      responseSpec.charsets,
      produceableCharsets
    );
  }
}

function executeHandler(operation, handler, parameters) {
  const responsePromise = handler(parameters, operation);

  if(!(responsePromise && responsePromise.then)) {
    throw new HTTPError(
      500,
      'E_NO_RESPONSE_PROMISE',
      operation.operationId,
      operation.method,
      operation.path
    );
  }
  return responsePromise
  .then((response) => {
    if(!response) {
      throw new HTTPError(500, 'E_NO_RESPONSE');
    }
    if('number' !== typeof response.status) {
      throw new HTTPError(500, 'E_NO_RESPONSE_STATUS');
    }

    response.headers = response.headers || {};
    return response;
  });
}
