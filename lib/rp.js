'use strict';

var Bluebird = require('bluebird'),
    assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    isFunction = require('lodash/lang/isFunction'),
    isPlainObject = require('lodash/lang/isPlainObject'),
    isString = require('lodash/lang/isString'),
    isUndefined = require('lodash/lang/isUndefined'),
    keys = require('lodash/object/keys'),
    errors = require('./errors.js');


// Load Request freshly - so that users can require an unaltered request instance!
var request = (function () {

    function clearCache() {
        forEach(keys(require.cache), function (key) {
            delete require.cache[key];
        });
    }

    var temp = assign({}, require.cache);
    clearCache();

    var freshRequest = require('request');

    clearCache();
    assign(require.cache, temp);

    return freshRequest;

})();


var defaultTransformations = {
    HEAD: function (body, response, resolveWithFullResponse) {
        return resolveWithFullResponse ? response : response.headers;
    }
};

function RP$callback(err, response, body) {

    /* jshint validthis:true */
    var self = this;

    var origCallbackThrewException = false, thrownException;

    if (isFunction(self._rp_callbackOrig)) {
        try {
            self._rp_callbackOrig.apply(self, arguments);
        } catch (e) {
            origCallbackThrewException = true;
            thrownException = e;
        }
    }

    if (err) {

        self._rp_reject(assign(new errors.RequestError(err), {
            error: err,
            options: self._rp_options,
            response: response
        }));

    } else if (self._rp_options.simple && !(/^2/.test('' + response.statusCode))) {

        self._rp_reject(assign(new errors.StatusCodeError(response.statusCode, body), {
            error: body,
            options: self._rp_options,
            response: response
        }));

    } else {
        if (isFunction(self._rp_options.transform)) {
            try {
                self._rp_resolve(self._rp_options.transform(body, response, self._rp_options.resolveWithFullResponse));
            } catch (e) {
                self._rp_reject(e);
            }
        } else if (self._rp_options.resolveWithFullResponse) {
            self._rp_resolve(response);
        } else {
            self._rp_resolve(body);
        }
    }

    if (origCallbackThrewException) {
        throw thrownException;
    }

}

var originalInit = request.Request.prototype.init;

request.Request.prototype.init = function RP$initInterceptor(options) {

    var self = this;

    // Init may be called again - currently in case of redirects
    if (isPlainObject(options) && self._callback === undefined && self._rp_promise === undefined) {

        self._rp_promise = new Bluebird(function (resolve, reject) {
            self._rp_resolve = resolve;
            self._rp_reject = reject;
        });

        self._rp_callbackOrig = self.callback;
        self.callback = RP$callback;

        if (isString(options.method)) {
            options.method = options.method.toUpperCase();
        }

        options.transform = options.transform || defaultTransformations[options.method];

        self._rp_options = options;
        self._rp_options.simple = options.simple === false ? false : true;
        self._rp_options.resolveWithFullResponse = options.resolveWithFullResponse === true ? true : false;

    }

    return originalInit.apply(self, arguments);

};

function expose(methodToExpose, exposeAs) {

    exposeAs = exposeAs || methodToExpose;

    /* istanbul ignore if */
    if (!isUndefined(request.Request.prototype[exposeAs])) {
        throw new Error('Unable to expose method "' + exposeAs + '". It is already implemented by Request. Please visit https://github.com/request/request-promise/wiki/Troubleshooting');
    }

    request.Request.prototype[exposeAs] = function RP$exposed() {
        return this._rp_promise[methodToExpose].apply(this._rp_promise, arguments);
    };

}

expose('then');
expose('catch');
expose('finally');

request.Request.prototype.promise = function RP$promise() {
    return this._rp_promise;
};


/* istanbul ignore next */ // Function covered but not seen by Instanbul.
request.bindCLS = function RP$bindCLS(ns) {
    require('cls-bluebird')(ns);
};


module.exports = request;
