'use strict';

var api = require('@request/api');
var client = require('@request/client');

module.exports = api({
    type: 'basic',
    define: {
        request: client
    }
});
