'use strict';

var request = require('request'),
    Bluebird = require('bluebird'),
    _ = require('lodash');


function ownCallback(err, httpResponse, body) {

    /* jshint validthis:true */

    if (_.isFunction(this._rp_callbackOrig)) {
        try {
            this._rp_callbackOrig.apply(this, arguments);
        } catch (e) { }
    }

    if (err) {
        this._rp_reject({
            error: err,
            options: this._rp_options,
            response: httpResponse
        });
    } else if (this._rp_options.simple && !(/^2/.test('' + httpResponse.statusCode))) {
        this._rp_reject({
            error: body,
            options: this._rp_options,
            response: httpResponse,
            statusCode: httpResponse.statusCode
        });
    } else {
        if (this._rp_options.transform && typeof this._rp_options.transform === 'function') {
            // FIXME: Produces unhandled exception if transform fails.
            this._rp_resolve(this._rp_options.transform(body));
        } else if (this._rp_options.resolveWithFullResponse) {
            this._rp_resolve(httpResponse);
        } else {
            this._rp_resolve(body);
        }
    }
}

var originalInit = request.Request.prototype.init;

request.Request.prototype.init = function (options) {

    this._rp_callbackOrig = this.callback;
    this.callback = ownCallback;

    this._rp_options = _.cloneDeep(options);
    this._rp_options.simple = options.simple === false ? false : true;
    this._rp_options.resolveWithFullResponse = options.resolveWithFullResponse === true ? true : false;
    this._rp_options.transform = options.transform;

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
