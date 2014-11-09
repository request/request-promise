'use strict';

var rp = require('../../../lib/rp.js');
var request = require('request');

var rpHasThen = rp('http://localhost:4000/200').then !== undefined;
var requestHasNoThen = request('http://localhost:4000/200').then === undefined;

console.log('rp: ' + rpHasThen + ', request: ' + requestHasNoThen);
