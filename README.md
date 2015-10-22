<a href="http://promisesaplus.com/">
    <img src="https://promises-aplus.github.io/promises-spec/assets/logo-small.png"
         align="right" valign="top" alt="Promises/A+ logo" />
</a>

# Request-Promise

[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/request/request-promise?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [![Build Status](https://travis-ci.org/request/request-promise.svg?branch=master)](https://travis-ci.org/request/request-promise) [![Coverage Status](https://coveralls.io/repos/request/request-promise/badge.svg?branch=master&service=github)](https://coveralls.io/github/request/request-promise?branch=master) [![Dependency Status](https://david-dm.org/request/request-promise.svg)](https://david-dm.org/request/request-promise)

The world-famous HTTP client "Request" now Promises/A+ compliant. Powered by Bluebird.

[Bluebird](https://github.com/petkaantonov/bluebird) and [Request](https://github.com/mikeal/request) are pretty awesome, but I found myself using the same design pattern. Request-Promise adds a Bluebird-powered `.then(...)` method to Request call objects. By default, http response codes other than 2xx will cause the promise to be rejected. This can be overwritten by setting `options.simple` to `false`.

## Installation

This module is installed via npm:

``` bash
npm install request-promise
```

Request-Promise depends on loosely defined versions of Request and Bluebird. If you want to use specific versions of those modules please install them beforehand.

## Cheat Sheet

``` js
var rp = require('request-promise');
```

### Crawl a webpage

``` js
rp('http://www.google.com')
    .then(function (htmlString) {
        // Process html...
    })
    .catch(function (err) {
        // Crawling failed...
    });
```

### Crawl a webpage better

``` js
var cheerio = require('cheerio'); // Basically jQuery for node.js

var options = {
    uri: 'http://www.google.com',
    transform: function (body) {
        return cheerio.load(body);
    }
};

rp(options)
    .then(function ($) {
        // Process html like you would with jQuery...
    })
    .catch(function (err) {
        // Crawling failed or Cheerio choked...
    });
```

### GET something from a JSON REST API

``` js
var options = {
    uri: 'https://api.github.com/user/repos',
    qs: {
        access_token: 'xxxxx xxxxx' // -> uri + '?access_token=xxxxx%20xxxxx'
    },
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
};

rp(options)
    .then(function (repos) {
        console.log('User has %d repos', repos.length);
    })
    .catch(function (err) {
        // API call failed...
    });
```

### POST data to a JSON REST API

``` js
var options = {
    method: 'POST',
    uri: 'http://posttestserver.com/post.php',
    body: {
        some: 'payload'
    },
    json: true // Automatically stringifies the body to JSON
};

rp(options)
    .then(function (parsedBody) {
        // POST succeeded...
    })
    .catch(function (err) {
        // POST failed...
    });
```

### POST like HTML forms do

``` js
var options = {
    method: 'POST',
    uri: 'http://posttestserver.com/post.php',
    form: {
        some: 'payload' // Will be urlencoded
    },
    headers: {
        /* 'content-type': 'application/x-www-form-urlencoded' */ // Set automatically
    }
};

rp(options)
    .then(function (body) {
        // POST succeeded...
    })
    .catch(function (err) {
        // POST failed...
    });
```

### Get the full response instead of just the body

``` js
var options = {
    method: 'DELETE',
    uri: 'http://my-server/path/to/resource/1234',
    resolveWithFullResponse: true    //  <---  <---  <---  <---
};

rp(options)
    .then(function (response) {
        console.log("DELETE succeeded with status %d", response.statusCode);
    })
    .catch(function (err) {
        // Delete failed...
    });
```

### Get a rejection only if the request failed for technical reasons

``` js
var options = {
    uri: 'http://www.google.com/this-page-does-not-exist.html',
    simple: false    //  <---  <---  <---  <---
};

rp(options)
    .then(function (body) {
        // Request succeeded but might as well be a 404
        // Usually combined with resolveWithFullResponse = true to check response.statusCode
    })
    .catch(function (err) {
        // Request failed due to technical reasons...
    });
```

---

**For more options checkout the [Request docs](https://github.com/request/request#requestoptions-callback).**

---

## API in Detail

Consider Request-Promise being:

- A Request object
	- With an [identical API](https://github.com/request/request): `require('request-promise') == require('request')` so to say
	- However, the **USE OF STREAMS** (e.g. `.pipe(...)`) is **DISCOURAGED** because Request-Promise would grow the memory footprint for large requests unnecessarily high. Use the original Request library for that. You can use both libraries in the same project.
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
	.catch(errors.StatusCodeError, function (reason) {
        // The server responded with a status codes other than 2xx.
        // Check reason.response.statusCode.
	})
    .catch(errors.RequestError, function (reason) {
        // The request failed due to technical reasons.
        // reason.cause is the Error object Request would pass into a callback.
	});
```

### The `transform` function

You can pass a function to `options.transform` to generate a custom fulfillment value when the promise gets resolved.

``` js
// Just for fun you could reverse the response body:
var options = {
	uri: 'http://google.com',
    transform: function (body, response, resolveWithFullResponse) {
        return body.split('').reverse().join('');
    }
};

rp(options)
    .then(function (reversedBody) {
        // ;D
    });


// However, you could also do something useful:
var $ = require('cheerio'); // Basically jQuery for node.js

function autoParse(body, response, resolveWithFullResponse) {
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

The third `resolveWithFullResponse` parameter of the transform function is equivalent to the option passed with the request. This allows to distinguish whether just the transformed body or the whole response shall be returned by the transform function:

``` js
function reverseBody(body, response, resolveWithFullResponse) {
    response.body = response.body.split('').reverse().join('');
    return resolveWithFullResponse ? response : response.body;
}
```

## Experimental Support for Continuation Local Storage

Continuation Local Storage (CLS) is a great mechanism for backpacking data along asynchronous call chains that is best explained in [these slides](http://fredkschott.com/post/2014/02/conquering-asynchronous-context-with-cls/). If you want to use CLS you need to install the [continuation-local-storage package](https://www.npmjs.com/package/continuation-local-storage). Request-Promise internally uses the [cls-bluebird package](https://www.npmjs.com/package/cls-bluebird) to enable CLS also within the Bluebird promises.

Just call `rp.bindCLS(ns)` **ONCE** before your first request to activate CLS:
``` js
var rp = require('request-promise');
var cls = require('continuation-local-storage');

var ns = cls.createNamespace('testNS');
rp.bindCLS(ns);

ns.run(function () {
    ns.set('value', 'hi');

    rp('http://google.com')
        .then(function () {
            console.log(ns.get('value')); // -> hi
        });
});
```

Since the [cls-bluebird package](https://www.npmjs.com/package/cls-bluebird) currently is just a quick and dirty implementation the CLS support is only experimental.

## Debugging

The ways to debug the operation of Request-Promise are the same [as described](https://github.com/request/request#debugging) for Request. These are:

1. Launch the node process like `NODE_DEBUG=request node script.js` (`lib,request,otherlib` works too).
2. Set `require('request-promise').debug = true` at any time (this does the same thing as #1).
3. Use the [request-debug module](https://github.com/nylen/request-debug) to view request and response headers and bodies. Instrument Request-Promise with `require('request-debug')(rp);`.

## Mocking Request-Promise

Usually you want to mock the whole request function which is returned by `require('request-promise')`. This is not possible by using a mocking library like [sinon.js](http://sinonjs.org) alone. What you need is a library that ties into the module loader and makes sure that your mock is returned whenever the tested code is calling `require('request-promise')`. [Mockery](https://github.com/mfncooper/mockery) is one of such libraries.

@florianschmidt1994 kindly shared his solution:
```javascript
before(function (done) {

    var filename = "fileForResponse";
    mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
    });

    mockery.registerMock('request-promise', function () {
        var response = fs.readFileSync(__dirname + '/data/' + filename, 'utf8');
        return Bluebird.resolve(response.trim());
    });

    done();
});

after(function (done) {
    mockery.disable();
    mockery.deregisterAll();
    done();
});

describe('custom test case', function () {
    //  Test some function/module/... which uses request-promise
    //  and it will always receive the predefined "fileForResponse" as data, e.g.:
    var rp = require('request-promise');
    rp(...).then(function(data) {
        // ➞ data is what is in fileForResponse
    });
});
```

Based on that you may now build a more sophisticated mock. [Sinon.js](http://sinonjs.org) may be of help as well.

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

- v1.0.2 (2015-10-22)
    - Removed continuation-local-storage from peer dependencies as it was unnecessary
      *(Thanks to @mrhyde for working on a better solution discussed in [issue #70](https://github.com/request/request-promise/issues/70))*
- v1.0.1 (2015-10-14)
    - Fixed a npm warning by marking continuation-local-storage as a peer dependency
- v1.0.0 (2015-10-11)
    - **Breaking Change**: Some errors that were previously thrown synchronously - e.g. for wrong input parameters - are now passed to the rejected promise instead
      *(Thanks to @josnidhin for suggesting that in [issue #43](https://github.com/request/request-promise/issues/43))*
    - **Breaking Change**: Request-Promise does not load its own Bluebird prototype anymore. If you use Bluebird in your project and altered the prototype then Request-Promise may use your altered Blurbird prototype internally.
    - For HEAD requests the headers instead of an empty body is returned (unless `resolveWithFullResponse = true` is used)
      *(Thanks to @zcei for proposing the change in [issue #58](https://github.com/request/request-promise/issues/58))*
    - Extended `transform` function by a third `resolveWithFullResponse` parameter
    - Added experimental support for continuation local storage
      *(Thanks to @silverbp preparing this in [issue #64](https://github.com/request/request-promise/issues/64))*
	- Added node.js 4 to the Travis CI build
	- Updated the README
	  *(Thanks to many people for their feedback in issues [#55](https://github.com/request/request-promise/issues/55) and [#59](https://github.com/request/request-promise/issues/59))*
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
    - **Minor Breaking Change:** The reject reason objects became actual Error objects. However, `typeof reason === 'object'` still holds true and the error objects have the same properties as the previous reason objects. If the reject handler only accesses the properties on the reason object - which is usually the case - no migration is required.
    - Added io.js and node.js 0.12 to the Travis CI build
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
	- Carefully rewritten from scratch to make Request-Promise a drop-in replacement for Request

## MIT Licensed

See the [LICENSE file](LICENSE) for details.
