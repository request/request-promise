var Promise = require('bluebird'),
    request = require('request');

function rp(options) {
    var statusCodes = {
        'GET' : [200],
        'HEAD' : [200],
        'PUT' : [200, 201],
        'POST' : [200, 201]
    }, c = {}, i;
    if (typeof options === 'string') {
        c.uri = options;
        c.method = 'GET';
    }
    if (typeof options === 'object') {
        for (i in options) {
            if (options.hasOwnProperty(i)) {
                c[i] = options[i];
            }
        }
    }
    c.method = c.method || 'GET';
    return new Promise(function (resolve, reject) {
        request(c, function (error, response, body) {
            if (error) {
                reject(error);
            } else if (c.simple && (statusCodes[c.method].indexOf(response.statusCode) > -1)) {
                reject(response.statusCode);
            } else {
                if (c.transform && typeof c.transform === 'function') {
                    resolve(c.transform(body));
                } else {
                    resolve(body);
                }
            }
        });
    });
}

module.exports = rp;
