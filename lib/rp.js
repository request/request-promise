'use strict';

var Bluebird = require('bluebird'),
    assign = require('lodash/assign'),
    forEach = require('lodash/forEach'),
    isFunction = require('lodash/isFunction'),
    isPlainObject = require('lodash/isPlainObject'),
    isString = require('lodash/isString'),
    isUndefined = require('lodash/isUndefined'),
    keys = require('lodash/keys'),
    errors = require('./errors.js');

// Used to handle HTTP 1.1 Cache
var moment = require('moment'),
    Cache = require('memory-cache');


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

var _computeAgeOfEntry = function (entry, now) {

  var created_at = moment(entry.created_at);
  var age = moment.duration(now.diff(entry.created_at)).asSeconds();

  // normalize the age in seconds
  age = -Math.floor(-age);
  entry.content.headers.age = age;
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

    // 304 response means we can reuse the cache entry we already had
    if (response && response.statusCode === 304 && self._rp_options.cache) {
        var now = moment();

        var cacheEntry = Cache.get('GET:' + response.request.uri.href);
        if (!cacheEntry) {
            throw new Error(response.request.uri.href + ' should have exit in the cache but it is not there');
        }

        cacheEntry.created_at = now;
        _computeAgeOfEntry(cacheEntry, now);
        response = cacheEntry.content;
    }

    if (err) {

        self._rp_reject(new errors.RequestError(err, self._rp_options, response));

    } else if (self._rp_options.simple && !(/^2/.test('' + response.statusCode))) {

        if (isFunction(self._rp_options.transform)) {

            (new Bluebird(function (resolve) {
                resolve(self._rp_options.transform(response.body, response, self._rp_options.resolveWithFullResponse)); // transform may return a Promise
            }))
                .then(function (transformedResponse) {
                    self._rp_reject(new errors.StatusCodeError(response.statusCode, body, self._rp_options, transformedResponse));
                })
                .catch(function (err) {
                    self._rp_reject(new errors.TransformError(err, self._rp_options, response));
                });

        } else {
            self._rp_reject(new errors.StatusCodeError(response.statusCode, body, self._rp_options, response));
        }

    } else {



        if (isFunction(self._rp_options.transform)) {

            (new Bluebird(function (resolve) {
                resolve(self._rp_options.transform(body, response, self._rp_options.resolveWithFullResponse)); // transform may return a Promise
            }))
                .then(function (transformedResponse) {
                    self._rp_resolve(transformedResponse);
                })
                .catch(function (err) {
                    self._rp_reject(new errors.TransformError(err, self._rp_options, response));
                });

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


/**
 * HTTP 1.1 Cache handling
 */
// Cache.debug(true);

var LAST_MODIFIED_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss z';
var isResolveWithFullResponseSet = false;


var _useInMemoryCache = function (requestOpts) {
    return !isUndefined(requestOpts.cache) && requestOpts.cache === true && (isUndefined(requestOpts.method) || requestOpts.method.toUpperCase() === 'GET');
};



var _httpCacheHandler = function (response) {

    // Restore option to its original state
    this._rp_options.resolveWithFullResponse = isResolveWithFullResponseSet;

    var useCache = true;
    var headers = response.headers;
    var cacheKey = 'GET:' + response.request.href;

    // Don't cache if Cache-Control doesn't exist
    if (isUndefined(headers['cache-control'])) {
        useCache = false;
    }

    // Don't cache on Cache-Control.no-cache
    if (!isUndefined(headers['cache-control']) && /no-cache/.test(headers['cache-control'])) {
        useCache = false;
    }

    // Don't cache if Cache-Control.max-age doesn't exist
    if (!isUndefined(headers['cache-control']) && !/max-age=(\d+)/.test(headers['cache-control'])) {
        useCache = false;
    }

    // Don't cache if Cache-Control.max-age is 0
    if (!isUndefined(headers['cache-control']) && /max-age=0/.test(headers['cache-control'])) {
        useCache = false;
    }

    if (useCache) {

        var age = !isUndefined(headers['age']) ? headers['age'] : 0,
            maxAge = parseInt(headers['cache-control'].match(/max-age=(\d+)/)[1]),
            lastModified;

        // Get Last-Modified
        if (isUndefined(headers['last-modified'])) {
            lastModified = headers['last-modified'];
        }

        if (maxAge > 0) {
            var now = moment();
            var createdAt = moment(now).subtract(age, 's');  // we reduce created_at from age to have a
                                                             // consistent age with the backend
            var value = {
                max_age: maxAge,
                content: response,
                created_at: createdAt,
                last_modified: lastModified || createdAt
            };

            // Add/Update entry age
            _computeAgeOfEntry(value, now);

            // This insert will also refresh `created_at` in case of 304 responses
            Cache.put(cacheKey, value);
        }
    }

    // Add age if undefined
    response.headers.age = headers['age'] || 0;

    // @TODO This return is being ignored
    return isResolveWithFullResponseSet ? response : response.body;
};


var _isCacheStale = function (cachedResponse) {

    if (cachedResponse) {
        var now = moment();
        _computeAgeOfEntry(cachedResponse, now);

        // Check if cache entry is a stale
        if (cachedResponse.content.headers.age > cachedResponse.max_age) {
            return cachedResponse.last_modified.format(LAST_MODIFIED_FORMAT);
        }
    }

    return false;
};

//
// Init
//
var originalInit = request.Request.prototype.init;

request.Request.prototype.init = function RP$initInterceptor(options) {

    var self = this;

    // Init may be called again - currently in case of redirects
    if (isPlainObject(options) && isUndefined(self._callback) && isUndefined(self._rp_promise)) {

        var cachedResponse = null;

        if (_useInMemoryCache(options)) {
            cachedResponse = Cache.get('GET:' + options.uri);

            // Store current status of `resolveWithFullResponse`
            isResolveWithFullResponseSet = options.resolveWithFullResponse || false;

            // Force resolveWithFullResponse to have access to the response header
            options.resolveWithFullResponse = true;

            if (cachedResponse) {
                var lastModified = _isCacheStale(cachedResponse);

                // Return cached resource if not stale
                if (!lastModified) {
                    _computeAgeOfEntry(cachedResponse, moment());

                    self._rp_promise = new Bluebird(function (resolve) {
                      resolve(isResolveWithFullResponseSet ? cachedResponse.content : cachedResponse.content.body);
                    });

                    return;
                } else {
                    // Add pre-flight header
                    options.headers = options.headers || {};
                    options.headers['If-Modified-Since'] = lastModified;

                    var etag = cachedResponse.content && cachedResponse.content.headers &&
                        cachedResponse.content.headers['etag'];
                    if ( etag ) {
                        options.headers['If-None-Match'] = etag;
                    }
                }
            }
        }

        if (isUndefined(self._rp_promise)) {
            self._rp_promise = new Bluebird(function (resolve, reject) {
                self._rp_resolve = resolve;
                self._rp_reject = reject;
            });

            if (_useInMemoryCache(options)) {
                self._rp_promise.then(_httpCacheHandler.bind(self));
            }
        }

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
