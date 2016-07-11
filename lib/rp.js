'use strict';

var Bluebird = require('bluebird'),
    configure = require('@request/promise-core/configure/request-next');


var api = require('@request/api');
var client = require('@request/client');


module.exports = api({
    type: 'basic',
    define: {
        request: configure({
            client: client,
            PromiseImpl: Bluebird,
            expose: [
                'then',
                'catch',
                'finally',
                'promise'
            ]
        })
    }
});

/* istanbul ignore next */ // Function covered but not seen by Instanbul.
module.exports.bindCLS = function RP$bindCLS(ns) {
    require('cls-bluebird')(ns);
};
