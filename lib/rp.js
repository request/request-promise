'use strict';

var Bluebird = require('bluebird'),
    configure = require('@request/promise-core/configure/request2'),
    stealthyRequire = require('stealthy-require')(require);

// Load Request freshly - so that users can require an unaltered request instance!
var request = stealthyRequire('request');


configure({
    request: request,
    PromiseImpl: Bluebird,
    expose: [
        'then',
        'catch',
        'finally',
        'promise'
    ]
});


module.exports = request;
