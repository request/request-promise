'use strict';

// Run with: node --expose-gc ./test/fixtures/memory-usage/aborted-requests.js

var _ = require('lodash');
var Bluebird = require('bluebird');
var rp = require('../../../');
// var rp = require('request');


var requests = [];
function createRequest(retain) {

    var request = rp('http://localhost:4000');
    request.abort();

    if (retain) {
        requests.push(request);
    }

}

function checkMemory() {
    global.gc(); // Requires the --expose-gc option
    console.log(process.memoryUsage().heapUsed + ' bytes in use');
}

Bluebird.resolve()
    .delay(1000)
    .then(checkMemory)
    .then(function () {

        _.times(100000, function () {

            createRequest(false); // Should be garbage collected because no reference is kept

        });

    })
    .delay(1000)
    .then(checkMemory)
    .then(function () {

        _.times(100000, function () {

            createRequest(true); // Should NOT be garbage collected because reference is kept in requests

        });

    })
    .delay(1000)
    .then(checkMemory);
