# Request-Promise

[![Dependency Status](https://david-dm.org/tyabonil/request-promise.svg)](https://david-dm.org/tyabonil/request-promise)

A Promises/A XHR wrapper for Bluebird and Request

[Bluebird](https://github.com/petkaantonov/bluebird) and
[Request](https://github.com/mikeal/request) are pretty awesome, but I found
myself using the same design pattern.  This is a simple wrapper that takes in a
request options object (or URI string), and returns a chainable promise.  By
default, http response codes other than 2xx will cause the promise to
be rejected.  This can be over-ridden by setting `options.simple` to `false`.

Note: As of version 0.1, `reject` now passes  an object containing the following:
```js    
    reject({
      error: body,
      options: c,
      response: response,
      statusCode: response.statusCode
    });
```

## Installation

`npm install request-promise`

## Examples

``` js
var rp = require('request-promise');

rp('http://www.google.com')
    .then(console.dir)
    .catch(console.error);

//'GET's and displays google.com

var options = {
    uri : 'http://posttestserver.com/post.php',
    method : 'POST'
}; 

rp(options)
    .then(console.dir)
    .catch(console.error);

//displays response from server after post

options.transform = function (data) { return data.length ;};

rp(options)
    .then(console.dir)
    .catch(console.error);

//transform is called just before promise is fulfilled
//displays length of response from server after post


// get full response after DELETE
options = {
  method: 'DELETE',
  uri: 'http://my-server/path/to/resource/1234',
  resolveWithFullResponse: true
};
rp(options)
  .then(function(response) {
    console.log("DELETE succeeded with status %d", response.statusCode);
  })
  .catch(console.error);
```

## Contributing

To set up your development environment:

1. clone the repo to your desktop,
2. in the shell `cd` to the main folder,
3. hit `npm install`,
4. hit `npm install gulp -g` if you haven't installed gulp globally yet, and
5. run `gulp dev`. (Or run `node ./node_modules/.bin/gulp dev` if you don't want to install gulp globally.)

`gulp dev` watches all source files and if you save some changes it will lint the code and execute all tests. The test coverage report can be viewed from `./coverage/lcov-report/index.html`.

If you want to debug a test you should use `gulp test-without-coverage` to run all tests without obscuring the code by the test coverage instrumentation.

## MIT Licenced
