'use strict';

var request1 = require('request');
var rp = require('../../../lib/rp.js');
var request2 = require('request');

var request1HasNoThen = request1('http://localhost:4000/200').then === undefined;
var rpHasThen = rp('http://localhost:4000/200').then !== undefined;
var request2IsIdenticalToRequest1 = request2 === request1;

console.log('request1: ' + request1HasNoThen + ', rp: ' + rpHasThen + ', request2: ' + request2IsIdenticalToRequest1);
