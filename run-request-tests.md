# How to run the tests of Requests for Request-Promise

Request-Promise aims to be almost identical to Request. Therefore most tests for Request should also be green executed against Request-Promise.

This is how to run the tests:

1. Create a temporary folder.
2. Clone [Request](https://github.com/request/request) into the temporary folder and run `npm install`.
3. Clone [Request-Promise](https://github.com/request/request-promise) into the temporary folder and run `npm install`.
4. Rename temp/request/index.js to temp/request/index-orig.js.
5. Create temp/request/index.js with the following content:

``` js
'use strict'

//module.exports = require('./index-orig.js')

var BPromise = require('../request-promise/node_modules/bluebird')
BPromise.onPossiblyUnhandledRejection(function (err) {
  return err
})
module.exports = require('../request-promise/')
```

6. Go to temp/request-promise/lib/rp.js
7. Comment out the `var request = stealthyRequire('request');` line.
8. Add `var request = require('../../request/index-orig.js');` right below.
9. Go to temp/request/ and run `npm test`.

Currently, only those tests fail that expect a request call to throw an exceptions. Request-Promise rejects the promise for those errors instead.
