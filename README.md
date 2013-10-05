# Request-Promise

A Promises/A XHR wrapper for Bluebird and Request

[Bluebird](https://github.com/petkaantonov/bluebird) and [Request](https://github.com/mikeal/request) are pretty awesome, but I found myself using the same design pattern.  This is a simple wrapper that takes in a request options object (or URI string), and returns a chainable promise.  By default, http response codes other than 200 and 201 will cause the promise to be rejected.  This can be over-ridden by setting `options.simple` to `false`.

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

```

## MIT Licenced