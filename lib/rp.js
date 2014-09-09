var Promise = require('bluebird'),
    request = require('request');

function rp(options) {
    var c = {simple: true}, i;
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
                reject({
                    error: error,
                    options: c,
                    response: response
                });
            } else if (c.simple && !(/^2/.test('' + response.statusCode))) {
                reject({
                    error: body,
                    options: c,
                    response: response,
                    statusCode: response.statusCode
                });
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

module.exports = function (a) {
    if (a) return rp(a);
};
