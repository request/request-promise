'use strict';

var request = require('./rp');

/* istanbul ignore next */ // Function covered but not seen by Instanbul.
request.bindCLS = function RP$bindCLS(ns) {
    require('cls-bluebird')(ns);
};

module.exports = request;
