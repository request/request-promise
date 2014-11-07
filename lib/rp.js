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
            self._rp_resolve(new Bluebird(function (resolve) {
                resolve(self._rp_options.transform(body, httpResponse));
            }));
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

    this._rp_callbackOrig = this.callback;
    this.callback = ownCallback;

    this._rp_options = options;
    this._rp_options.simple = options.simple === false ? false : true;
    this._rp_options.resolveWithFullResponse = options.resolveWithFullResponse === true ? true : false;

    return originalInit.apply(this, arguments);

};

request.Request.prototype.then = function (onFulfilled, onRejected) {

    var self = this;

    return new Bluebird(function (resolve, reject) {

        self._rp_resolve = resolve;
        self._rp_reject = reject;

    }).then(onFulfilled, onRejected);

};

module.exports = request;
