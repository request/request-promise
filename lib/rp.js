'use strict';

var request = require('request'),
    Bluebird = require('bluebird'),
    _ = require('lodash');


function ownCallback(err, httpResponse, body) {

    /* jshint validthis:true */
    var self = this;

    if (_.isFunction(self._rp_callbackOrig)) {
        try {
            self._rp_callbackOrig.apply(self, arguments);
        } catch (e) { }
    }

    if (err) {
        self._rp_reject({
            error: err,
            options: self._rp_options,
            response: httpResponse
        });
    } else if (self._rp_options.simple && !(/^2/.test('' + httpResponse.statusCode))) {
        self._rp_reject({
            error: body,
            options: self._rp_options,
            response: httpResponse,
            statusCode: httpResponse.statusCode
        });
    } else {
        if (_.isFunction(self._rp_options.transform)) {
            try {
                self._rp_resolve(self._rp_options.transform(body, httpResponse));
            } catch (e) {
                self._rp_reject(e);
            }
        } else if (self._rp_options.resolveWithFullResponse) {
            self._rp_resolve(httpResponse);
        } else {
            self._rp_resolve(body);
        }
    }

}

var originalInit = request.Request.prototype.init;

request.Request.prototype.init = function (options) {

    if (_.isString(options.method)) {
        options.method = options.method.toUpperCase();
    }

    var self = this;

    self._rp_promise = new Bluebird(function (resolve, reject) {

        self._rp_resolve = resolve;
        self._rp_reject = reject;

    });

    self._rp_callbackOrig = self.callback;
    self.callback = ownCallback;

    self._rp_options = options;
    self._rp_options.simple = options.simple === false ? false : true;
    self._rp_options.resolveWithFullResponse = options.resolveWithFullResponse === true ? true : false;

    return originalInit.apply(self, arguments);

};

request.Request.prototype.then = function (onFulfilled, onRejected) {
    return this._rp_promise.then(onFulfilled, onRejected);
};

module.exports = request;
