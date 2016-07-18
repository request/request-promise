'use strict';

var Bluebird = require('bluebird'),
    configure = require('@request/promise-core/configure/request2'),
    stealthyRequire = require('stealthy-require');

try {

    // Load Request freshly - so that users can require an unaltered request instance!
    var request = stealthyRequire(require.cache, function () {
        return require('request');
    });

} catch (err) {
    /* istanbul ignore next */
    var EOL = require('os').EOL;
    /* istanbul ignore next */
    console.error(EOL + '###' + EOL + '### The "request" library is not installed automatically anymore.' + EOL + '### But required by "request-promise".' + EOL + '###' + EOL + '### npm install request --save' + EOL + '###' + EOL);
    /* istanbul ignore next */
    throw err;
}


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


request.bindCLS = function RP$bindCLS() {
    throw new Error('CLS support was dropped. To get it back read: https://github.com/request/request-promise/wiki/Getting-Back-Support-for-Continuation-Local-Storage');
};


module.exports = request;
