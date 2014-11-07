# Request-Promise

[![Build Status](https://travis-ci.org/tyabonil/request-promise.svg?branch=master)](https://travis-ci.org/tyabonil/request-promise) [![Dependency Status](https://david-dm.org/tyabonil/request-promise.svg)](https://david-dm.org/tyabonil/request-promise)

The world-famous HTTP client "Request" now Promises/A+ compliant. Powered by Bluebird.

[Bluebird](https://github.com/petkaantonov/bluebird) and [Request](https://github.com/mikeal/request) are pretty awesome, but I found myself using the same design pattern. Request-Promise adds a `then` method to the Request object which returns a Bluebird promise for chainability. By default, http response codes other than 2xx will cause the promise to be rejected. This can be over-ridden by setting `options.simple` to `false`.

## Request-Promise is a drop-in replacement for Request

Since version 0.3.0 Request-Promise is not a wrapper around Request anymore. It now adds a `then` method to Request and exports the original Request object. This means you can now use all features of Request.

See the [migration instructions](#migrating-from-02x-to-03x) for important changes. Issues and pull requests for 0.2.x are still welcome.

## Installation

[![NPM](https://nodei.co/npm/request-promise.png?compact=true)](https://nodei.co/npm/request-promise/)

This module is installed via npm:

``` bash
npm install request-promise
```

Request-Promise depends on loosely defined versions of Request and Bluebird. If you want to use specific versions of those modules please install them beforehand.

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

## API in detail

Description forthcoming.

## Debugging

The ways to debug the operation of Request-Promise are the same [as described](https://github.com/request/request#debugging) for Request. These are:

1. Launch the node process like `NODE_DEBUG=request node script.js` (`lib,request,otherlib` works too).
2. Set `require('request-promise').debug = true` at any time (this does the same thing as #1).
3. Use the [request-debug module](https://github.com/nylen/request-debug) to view request and response headers and bodies. Instrument Request-Promise with `require('request-debug')(rp);`.

## Migrating from 0.2.x to 0.3.x

The module was rewritten with great care accompanied by plenty of automated tests. In most cases you can just update Request-Promise and your code will continue to work.

First and foremost Request-Promise now exposes Request directly. That means the API sticks to that of Request. The only methods and options introduced by Request-Promise are:

- The `then` method
- The `simple` option
- The `resolveWithFullResponse` option
- The `transform` option

In regard to these methods and options Request-Promise 0.3.x is largely compatible with 0.2.x. All other parts of the API may differ in favor of the original behavior of Request.

### Changes and Removed Quirks

(`rp_02x` and `rp_03x` refer to the function exported by the respective version of Request-Promise.)

- `rp_02x(...)` returned a Bluebird promise. `rp_03x(...)` returns a Request instance with a `then` method. If you used any Bluebird method other than `then` as the first method in the chain your code cannot use Request-Promise 0.3.x. Please note that this only applies to the **first** method in the chain. E.g. `rp_03x(...).then(...).catch(...)` is still possible. Only something like `rp_03x(...).catch(...)` is not possible. Please open an issue if you need support for e.g. `catch` as the first method in the chain.
- The options `simple` and `resolveWithFullResponse` must be of type boolean. If they are of different type Request-Promise 0.3.x will use the defaults. In 0.2.x the behaviour for non-boolean values was different.
- `rp_03x.head(...)` throws an exception if the options contain a request body. This is due to Requests original implementation which was not used in Request-Promise 0.2.x.
- `rp_02x.request` does not exist in Request-Promise 0.3.x since Request is exported directly. (`rp_02x.request === rp_03x`)

### Recommended Testing

To ensure that nothing will break once you update Request-Promise is something close to impossible from our side. Therefore you must test responsibly. Here are some areas which we recommend you to test:

- List forthcoming.
- `rp.defaults`
- `rp.<wrapMethods>` seems to be ok -> write tests

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

- v0.3.0 (forthcoming)
	- Carefully rewritten from scratch to make Request-Promise a [drop-in replacement for Request](#request-promise-is-a-drop-in-replacement-for-request)

## MIT Licensed

See the [LICENSE file](LICENSE) for details.
