'use strict';

/**
 * HTTP 1.1 Cache Implementation
 *
 * @url https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html
 *
 *      The goal of caching in HTTP/1.1 is to eliminate the need to send requests in many cases, 
 *      and to eliminate the need to send full responses in many other cases. The former reduces 
 *      the number of network round-trips required for many operations; we use an "expiration" 
 *      mechanism for this purpose. The latter reduces network bandwidth requirements; we use a 
 *      "validation" mechanism for this purpose.
 * 
 */
var moment = require('moment'),
    isUndefined = require('lodash/isUndefined'),
    CacheEngine = require('memory-cache');

var LAST_MODIFIED_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss z';

/**
 * Caching Engine Interface
 * Can be replaced/extended with other (in-memory) caching implementation.
 * 
 * @api    {private}
 * @param  {object} cacheEngine
 * @return {object}
 */
var _CacheInterface = (function (cacheEngine) {
    // cacheEngine.debug(true);

    var buildKey = function (key) {
        return 'GET:' + key;
    };

    return {
        /**
         * Add entry to Cache
         */
        set: function (key, value) {

            cacheEngine.put(buildKey(key), value);
        },
        /**
         * Retrieve entry from Cache
         */
        get: function (key) {

            return cacheEngine.get(buildKey(key));
        }
    };
})(CacheEngine);


/**
 * HTTP 1.1 Cache
 * 
 * (constructor function)
 */
function HttpCache () {

    this.isResolveWithFullResponseSet = false;
    this.options = {};
    this.Cache = _CacheInterface;
}

// Instance to be exported as singleton
var httpCache = new HttpCache();


/**
 * Depending on the request options, check whether Cache can be used 
 * 
 * @param  {object} requestOpts
 * @return {boolean}
 */
HttpCache.prototype.useCache = function (requestOpts) {
    
    this.options = requestOpts;

    return !isUndefined(requestOpts.cache) && requestOpts.cache === true && 
           (isUndefined(requestOpts.method) || requestOpts.method.toUpperCase() === 'GET');
};

/**
 * Check whether a cache entry has expire
 * 
 * @param  {object} cachedResponse
 * @return {mixed}  false:   if entry is still valid
 *                  string:  last-modified date if expired
 */
HttpCache.prototype.isStale = function (cachedResponse) {

    if (cachedResponse) {
        var now = this.now();
        this.computeAgeOfEntry(cachedResponse, now);

        // Check if cache entry is a stale
        if (cachedResponse.content.headers.age > cachedResponse.max_age) {
            return cachedResponse.last_modified.format(LAST_MODIFIED_FORMAT);
        }
    }

    return false;
};

/**
 * Calculate the age of a Cache entry
 * (`now` - `created date`)
 * 
 * @param  {object} entry
 * @param  {Moment} now
 */
HttpCache.prototype.computeAgeOfEntry = function (entry, now) {

    now = now || httpCache.now();

    var created_at = moment(entry.created_at);
    var age = moment.duration(now.diff(entry.created_at)).asSeconds();

    // Normalize the age in seconds
    age = -Math.floor(-age);
    entry.content.headers.age = age;
};

/**
 * Callback handler used to cache responses from `Request Promise`
 * 
 * @param  {promise} response
 * @return {mixed}
 */
HttpCache.prototype.responseHandler = function (response) {

    // Restore option to its original state
    this._rp_options.resolveWithFullResponse = this.isResolveWithFullResponseSet;

    var useCache = true;
    var headers = response.headers;
    var cacheKey = response.request.href;

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
            var now = httpCache.now();
            var createdAt = moment(now).subtract(age, 's');  // we reduce created_at from age to have a
                                                             // consistent age with the backend
            var value = {
                max_age: maxAge,
                content: response,
                created_at: createdAt,
                last_modified: lastModified || createdAt
            };

            // Add/Update entry age
            httpCache.computeAgeOfEntry(value, now);

            // This insert will also refresh `created_at` in case of 304 responses
            httpCache.set(cacheKey, value);
        }
    }

    // Add age if undefined
    response.headers.age = headers['age'] || 0;

    // @TODO This return is being ignored
    return this.isResolveWithFullResponseSet ? response : response.body;
};

/**
 * Retrieve cache entry
 * 
 * @param  {string} key
 * @return {mixed}
 */
HttpCache.prototype.get = function (key) {

    return this.Cache.get(key);
};

/**
 * Add entry to cache
 * 
 * @param {string} key
 * @param {mixed}  value
 */
HttpCache.prototype.set = function (key, value) {

  this.Cache.set(key, value);
};

/**
 * Get current timestamp
 * 
 * @return {Moment}
 */
HttpCache.prototype.now = function () {

    return moment();
};


// Export module (singleton)
module.exports = httpCache;