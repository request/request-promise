'use strict';


function RequestError(cause, options, response) {

    this.name = 'RequestError';
    this.message = String(cause);
    this.cause = cause;
    this.error = cause; // legacy attribute
    this.options = options;
    this.response = response;

    if (Error.captureStackTrace) { // if required for non-V8 envs - see PR #40
        Error.captureStackTrace(this);
    }

}
RequestError.prototype = Object.create(Error.prototype);
RequestError.prototype.constructor = RequestError;


function StatusCodeError(statusCode, body, options, response) {

    this.name = 'StatusCodeError';
    this.statusCode = statusCode;
    this.message = statusCode + ' - ' + (JSON && JSON.stringify ? JSON.stringify(body) : body);
    this.error = body; // legacy attribute
    this.options = options;
    this.response = response;

    if (Error.captureStackTrace) { // if required for non-V8 envs - see PR #40
        Error.captureStackTrace(this);
    }

}
StatusCodeError.prototype = Object.create(Error.prototype);
StatusCodeError.prototype.constructor = StatusCodeError;


function TransformError(cause, options, response) {

    this.name = 'TransformError';
    this.message = String(cause);
    this.cause = cause;
    this.error = cause; // legacy attribute
    this.options = options;
    this.response = response;

    if (Error.captureStackTrace) { // if required for non-V8 envs - see PR #40
        Error.captureStackTrace(this);
    }

}
TransformError.prototype = Object.create(Error.prototype);
TransformError.prototype.constructor = TransformError;


module.exports = {
    RequestError: RequestError,
    StatusCodeError: StatusCodeError,
    TransformError: TransformError
};
