<a href="http://promisesaplus.com/">
    <img src="https://promises-aplus.github.io/promises-spec/assets/logo-small.png"
         align="right" valign="top" alt="Promises/A+ logo" />
</a>

# Request-Promise

---

Using io.js? Please read the [support section](#support-for-iojs).

**Users of version 0.2.x please read the [migration instructions](#migrating-from-02x-to-03x)!**

---

[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/request/request-promise?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [![Build Status](https://travis-ci.org/request/request-promise.svg?branch=master)](https://travis-ci.org/request/request-promise) [![Coverage Status](http://img.shields.io/badge/coverage-far%20beyond%20100%25-brightgreen.svg)](#can-i-trust-this-module) [![Dependency Status](https://david-dm.org/request/request-promise.svg)](https://david-dm.org/request/request-promise)

The world-famous HTTP client "Request" now Promises/A+ compliant. Powered by Bluebird.

[Bluebird](https://github.com/petkaantonov/bluebird) and [Request](https://github.com/mikeal/request) are pretty awesome, but I found myself using the same design pattern. Request-Promise adds a Bluebird-powered `.then(...)` method to Request call objects. By default, http response codes other than 2xx will cause the promise to be rejected. This can be overwritten by setting `options.simple` to `false`.

## Request-Promise is a drop-in replacement for Request

Since version 0.3.0 Request-Promise is not a wrapper around Request anymore. It now adds a `.then(...)` method to the Request prototype and exports the original Request object. This means you can now use all features of Request.

Request-Promise is perfect for replacing callbacks with promises. However, if you want to pipe large quantities of data we recommend using Request for the reason [described below](#can-i-trust-this-module). Both Request and Request-Promise can be required side by side.

See the [migration instructions](#migrating-from-02x-to-03x) for important changes between 0.2.x and 0.3.x. Issues and pull requests for 0.2.x are still welcome.

## Installation

[![NPM](https://nodei.co/npm/request-promise.png?compact=true)](https://nodei.co/npm/request-promise/)

This module is installed via npm:

``` bash
npm install request-promise
```

Request-Promise depends on loosely defined versions of Request and Bluebird. If you want to use specific versions of those modules please install them beforehand.

Node.js version 0.10 and up is supported.

## Examples

``` js
var rp = require('request-promise');

rp('http://www.google.com')
    .then(console.dir)
    .catch(console.error);

// --> 'GET's and displays google.com

var options = {
    uri : 'http://posttestserver.com/post.php',
    method : 'POST'
};

rp(options)
    .then(console.dir)
    .catch(console.error);

// --> Displays response from server after post

options.transform = function (data) { return data.length; };

rp(options)
    .then(console.dir)
    .catch(console.error);

// transform is called just before promise is fulfilled
// --> Displays length of response from server after post


// Get full response after DELETE
options = {
    method: 'DELETE',
    uri: 'http://my-server/path/to/resource/1234',
    resolveWithFullResponse: true
};

rp(options)
    .then(function (response) {
        console.log("DELETE succeeded with status %d", response.statusCode);
    })
    .catch(console.error);
```

## API in Detail

Consider Request-Promise being:

- A Request object
	- With an [identical API](https://github.com/request/request): `require('request-promise') == require('request')` so to say
- Plus some methods on a request call object:
	- `rp(...).then(...)` or e.g. `rp.post(...).then(...)` which turn `rp(...)` and `rp.post(...)` into promises
	- `rp(...).catch(...)` or e.g. `rp.del(...).catch(...)` which is the same method as provided by Bluebird promises
	- `rp(...).finally(...)` or e.g. `rp.put(...).finally(...)` which is the same method as provided by Bluebird promises
	- `rp(...).promise()` or e.g. `rp.head(...).promise()` which returns the underlying promise so you can access the full [Bluebird API](https://github.com/petkaantonov/bluebird/blob/master/API.md)
- Plus some additional options:
	- `simple` which is a boolean to set whether status codes other than 2xx should also reject the promise
	- `resolveWithFullResponse` which is a boolean to set whether the promise should be resolve with the full response or just the response body
	- `transform` which takes a function to transform the response into a custom value with which the promise is resolved

The objects returned by request calls like `rp(...)` or e.g. `rp.post(...)` are regular Promises/A+ compliant promises and can be assimilated by any compatible promise library. 

The methods `.then(...)`, `.catch(...)`, and `.finally(...)` - which you can call on the request call objects - return a full-fledged Bluebird promise. That means you have the full [Bluebird API](https://github.com/petkaantonov/bluebird/blob/master/API.md) available for further chaining. E.g.: `rp(...).then(...).spread(...)` If, however, you need a method other than `.then(...)`, `.catch(...)`, or `.finally(...)` to be **FIRST** in the chain, use `.promise()`: `rp(...).promise().bind(...).then(...)`

### .then(onFulfilled, onRejected)

``` js
// As a Request user you would write:
var request = require('request');

request('http://google.com', function (err, response, body) {
    if (err) {
        handleError({ error: err, response: response, ... });
    } else if (!(/^2/.test('' + response.statusCode))) { // Status Codes other than 2xx
        handleError({ error: body, response: response, ... });
    } else {
        process(body);
    }
});

// As a Request-Promise user you can now write the equivalent code:
var rp = require('request-promise');

rp('http://google.com')
    .then(process, handleError);
```

``` js
// The same is available for all http method shortcuts:
request.post('http://example.com/api', function (err, response, body) { ... });
rp.post('http://example.com/api').then(...);
```

### .catch(onRejected)

``` js
rp('http://google.com')
    .catch(handleError);

// ... is syntactical sugar for:

rp('http://google.com')
    .then(null, handleError);


// By the way, this:
rp('http://google.com')
    .then(process)
    .catch(handleError);

// ... is equivalent to:
rp('http://google.com')
    .then(process, handleError);
```

### .finally(onFinished)

``` js
rp('http://google.com')
    .finally(function () {
	    // This is called after the request finishes either successful or not successful.
	});
```

### .promise() - For advanced use cases

In order to not pollute the Request call objects with the methods of the underlying Bluebird promise, only `.then(...)`, `.catch(...)`, and `.finally(...)` were exposed to cover most use cases. The effect is that any methods of a Bluebird promise other than `.then(...)`, `.catch(...)`, or `.finally(...)` cannot be used as the **FIRST** method in the promise chain:

``` js
// This works:
rp('http://google.com').then(function () { ... });
rp('http://google.com').catch(function () { ... });

// This works as well since additional methods are only used AFTER the FIRST call in the chain:
rp('http://google.com').then(function () { ... }).spread(function () { ... });
rp('http://google.com').catch(function () { ... }).error(function () { ... });

// Using additional methods as the FIRST call in the chain does not work:
// rp('http://google.com').bind(this).then(function () { ... });

// Use .promise() in these cases:
rp('http://google.com').promise().bind(this).then(function () { ... });
```

### Fulfilled promises and the `resolveWithFullResponse` option

``` js
// Per default the body is passed to the fulfillment handler:
rp('http://google.com')
    .then(function (body) {
        // Process the html of the Google web page...
    });

// The resolveWithFullResponse options allows to pass the full response:
rp({ uri: 'http://google.com', resolveWithFullResponse: true })
    .then(function (response) {
        // Access response.statusCode, response.body etc.
    });

```

### Rejected promises and the `simple` option

``` js
// The rejection handler is called with a reason object...
rp('http://google.com')
    .catch(function (reason) {
        // Handle failed request...
	});

// ... and would be equivalent to this Request-only implementation:
var options = { uri: 'http://google.com' };

request(options, function (err, response, body) {
    var reason;
    if (err) {
        reason = {
            cause: err,
            error: err,
            options: options,
            response: response
        };
	} else if (!(/^2/.test('' + response.statusCode))) { // Status Codes other than 2xx
        reason = {
            statusCode: response.statusCode,
            error: body,
            options: options,
            response: response
        };
    }

    if (reason) {
        // Handle failed request...
    }
});


// If you pass the simple option as false...
rp({ uri: 'http://google.com', simple: false })
    .catch(function (reason) {
        // Handle failed request...
	});

// ... the equivalent Request-only code would be:
request(options, function (err, response, body) {
    if (err) {
        var reason = {
            cause: err,
            error: err,
            options: options,
            response: response
        };
        // Handle failed request...
	}
});
// E.g. a 404 would now fulfill the promise.
// Combine it with resolveWithFullResponse = true to check the status code in the fulfillment handler.
```

With version 0.4 the reason objects became Error objects with identical properties to ensure backwards compatibility. These new Error types allow targeted catch blocks:

``` js
var errors = require('request-promise/errors');

rp('http://google.com')
    .catch(errors.RequestError, function (reason) {
        // Handle a failed request for which Request provided an error...
        // reason.cause is the Error object Request would pass into a callback.
	})
	.catch(errors.StatusCodeError, function (reason) {
        // Handle responses with status codes other than 2xx...
	});
```

### The `transform` function

You can pass a function to `options.transform` to generate a custom fulfillment value when the promise gets resolved.

``` js
// Just for fun you could reverse the response body:
var options = {
	uri: 'http://google.com',
    transform: function (body, response) {
        return body.split('').reverse().join('');
    }
};

rp(options)
    .then(function (reversedBody) {
        // #@-?
    });


// However, you could also do something useful:
var $ = require('cheerio'); // Basically jQuery for node.js

function autoParse(body, response) {
    // FIXME: The content type string could contain additional values like the charset.
    if (response.headers['content-type'] === 'application/json') {
        return JSON.parse(body);
    } else if (response.headers['content-type'] === 'text/html') {
        return $.load(body);
    } else {
        return body;
    }
}

options.transform = autoParse;

rp(options)
    .then(function (autoParsedBody) {
        // :)
    });


// You can go one step further and set the transform as the default:
var rpap = rp.defaults({ transform: autoParse });

rpap('http://google.com')
    .then(function (autoParsedBody) {
        // :)
    });

rpap('http://echojs.com')
    .then(function (autoParsedBody) {
        // =)
    });
```

## Debugging

The ways to debug the operation of Request-Promise are the same [as described](https://github.com/request/request#debugging) for Request. These are:

1. Launch the node process like `NODE_DEBUG=request node script.js` (`lib,request,otherlib` works too).
2. Set `require('request-promise').debug = true` at any time (this does the same thing as #1).
3. Use the [request-debug module](https://github.com/nylen/request-debug) to view request and response headers and bodies. Instrument Request-Promise with `require('request-debug')(rp);`.

## Migrating from 0.2.x to 0.3.x

The module was rewritten with great care accompanied by plenty of automated tests. In most cases you can just update Request-Promise and your code will continue to work.

First and foremost Request-Promise now exposes Request directly. That means the API sticks to that of Request. The only methods and options introduced by Request-Promise are:

- The `.then(...)` method
- The `.catch(...)` method
- The `.finally(...)` method
- The `.promise()` method
- The `simple` option
- The `resolveWithFullResponse` option
- The `transform` option

In regard to these methods and options Request-Promise 0.3.x is largely compatible with 0.2.x. All other parts of the API may differ in favor of the original behavior of Request.

### Changes and Removed Quirks

(`rp_02x` and `rp_03x` refer to the function exported by the respective version of Request-Promise.)

- `rp_02x(...)` returned a Bluebird promise. `rp_03x(...)` returns a Request instance with a `.then(...)`, a `.catch(...)`, and a `.finally(...)` method. If you used any Bluebird method other than `.then(...)`, `.catch(...)`, and `.finally(...)` as the **FIRST** method in the promise chain, your code needs a small change to use Request-Promise 0.3.2 and up: Use the [`.promise()` method](#promise---for-advanced-use-cases) to retrieve the full-fledged Bluebird promise. E.g. `rp_02x(...).bind(...)` needs to be changed to `rp_03x(...).promise().bind(...)`
  Please note that this only applies to the **FIRST method in the chain**. E.g. `rp_03x(...).then(...).spread(...)` is still possible. Only something like `rp_02x(...).spread(...)` needs to be changed to `rp_03x(...).promise().spread(...)`.
  If, however, you have a large code base in production and making this small change is not an option or you think that exposing another Bluebird method directly on the Request instance would be more convenient for a common use case, please open an issue.
- The options `simple` and `resolveWithFullResponse` must be of type boolean. If they are of different type Request-Promise 0.3.x will use the defaults. In 0.2.x the behavior for non-boolean values was different.
- The object passed as the reason of a rejected promise contains an `options` object that differs between both versions. Especially the `method` property is not set if the default (GET) is applied.
- If you called `rp_02x(...)` without appending a `.then(...)` call occurring errors may have been discarded. Request-Promise 0.3.x may now throw those. However, if you append a `.then(...)` call those errors reject the promise in both versions.
- `rp_03x.head(...)` throws an exception if the options contain a request body. This is due to Requests original implementation which was not used in Request-Promise 0.2.x.
- `rp_02x.request` does not exist in Request-Promise 0.3.x since Request is exported directly. (`rp_02x.request === rp_03x`)

## Support for io.js

We added io.js to our Travis CI build and all tests are green. However, they mostly cover the functionality of Request-Promise itself. Barely of Request and Bluebird. At the time of writing Request did but Bluebird didn't add io.js to its build, yet. So please use io.js with care.

## Can I trust this module?

The approx. 120 lines of code – on top of the well tested libraries Request and Bluebird – are covered by over 60 tests producing a test coverage of 100% and beyond. Additionally, the original tests of Request were executed on Request-Promise to ensure that we can call it "a drop-in replacement for Request". So yes, we did our best to make Request-Promise live up to the quality Request and Bluebird are known for.

However, there is one important design detail: Request-Promise passes a callback to each Request call which it uses to resolve or reject the promise. The callback is also registered if you don't use the promise features in a certain request. E.g. you may only use streaming: `rp(...).pipe(...)` As a result, [additional code](https://github.com/request/request/blob/master/request.js#L1010-L1059) is executed that buffers the streamed data and passes it as the response body to the "complete" event. If you stream [large quantities of data](https://github.com/request/request-promise/issues/53) the buffer grows big and that has an impact on your memory footprint. In these cases you can just `var request = require('request');` and use `request` for streaming large quantities of data.

## Contributing

To set up your development environment:

1. clone the repo to your desktop,
2. in the shell `cd` to the main folder,
3. hit `npm install`,
4. hit `npm install gulp -g` if you haven't installed gulp globally yet, and
5. run `gulp dev`. (Or run `node ./node_modules/.bin/gulp dev` if you don't want to install gulp globally.)

`gulp dev` watches all source files and if you save some changes it will lint the code and execute all tests. The test coverage report can be viewed from `./coverage/lcov-report/index.html`.

If you want to debug a test you should use `gulp test-without-coverage` to run all tests without obscuring the code by the test coverage instrumentation.

## Change History

### Main Branch

- v0.4.3 (2015-07-27)
    - Reduced overhead by just requiring used lodash functions instead of the whole lodash library
      *(Thanks to @luanmuniz for [pull request #54](https://github.com/request/request-promise/pull/54))*
    - Updated dependencies
- v0.4.2 (2015-04-12)
    - Updated dependencies
- v0.4.1 (2015-03-20)
    - Improved Error types to work in browsers without v8 engine
      *(Thanks to @nodiis for [pull request #40](https://github.com/request/request-promise/pull/40))*
- v0.4.0 (2015-02-08)
    - Introduced Error types used for the reject reasons (See last part [this section](#rejected-promises-and-the-simple-option))
      *(Thanks to @jakecraige for starting the discussion in [issue #38](https://github.com/request/request-promise/issues/38))*
    - **Minor Braking Change:** The reject reason objects became actual Error objects. However, `typeof reason === 'object'` still holds true and the error objects have the same properties as the previous reason objects. If the reject handler only accesses the properties on the reason object - which is usually the case - no migration is required.
    - [Added io.js](#support-for-iojs) and node.js 0.12 to the Travis CI build
- v0.3.3 (2015-01-19)
    - Fixed handling possibly unhandled rejections to work with the latest version of Bluebird
      *(Thanks to @slang800 for reporting this in [issue #36](https://github.com/request/request-promise/issues/36))*
- v0.3.2 (2014-11-17)
	- Exposed `.finally(...)` to allow using it as the first method in the promise chain
	  *(Thanks to @hjpbarcelos for his [pull request #28](https://github.com/request/request-promise/pull/28))*
- v0.3.1 (2014-11-11)
	- Added the `.promise()` method for advanced Bluebird API usage
	  *(Thanks to @devo-tox for his feedback in [issue #27](https://github.com/request/request-promise/issues/27))*
- v0.3.0 (2014-11-10)
	- Carefully rewritten from scratch to make Request-Promise a [drop-in replacement for Request](#request-promise-is-a-drop-in-replacement-for-request)

### Version 0.2.x Branch

- v0.2.7 (2014-11-17)
	- Fixed http method shortcuts like `rp.get(...)` when used with passing an options object
	  *(Thanks to @hjpbarcelos for reporting this in [issue #29](https://github.com/request/request-promise/issues/29))*
- v0.2.6 (2014-11-09)
	- When calling `rp.defaults(...)` the passed `resolveWithFullResponse` option is not always overwritten by the default anymore.
	- The function passed as the `transform` option now also gets the full response as the second parameter. The new signature is: `function (body, response) { }`
	  *(Thanks to @khankuan for his feedback in [issue #24](https://github.com/request/request-promise/issues/24))*
	- If the transform function throws an exception it is caught and the promise is rejected with it.
- v0.2.5 (2014-11-06)
	- The Request instance which is wrapped by Request-Promise is exposed as `rp.request`.
	  *(Thanks to @hjpbarcelos for his feedback in [issue #23](https://github.com/request/request-promise/issues/23))*

## MIT Licensed

See the [LICENSE file](LICENSE) for details.
