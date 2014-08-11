var Promise = require('bluebird'),
    request = require('request');

var statusCodes = {
    'GET' : [200],
    'HEAD' : [200],
    'PUT' : [200, 201],
    'POST' : [200, 201],
    'DELETE' : [200, 201]
}, c = {simple: true}, i;

function rp(options) {
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
    return buildPromise(c);
}

function buildPromise (c) {
    return new Promise(function (resolve, reject) {
            request(c, function (error, response, body) {
            if (error) {
                reject({
                    error: error,
                    options: c,
                    response: response
                });
            } else if (c.simple && (statusCodes[c.method].indexOf(response.statusCode) === -1)) {
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

var wrapMethods = [
    'post',
    'put',
    'patch',
    'head',
    'del',
    'get'
];

var methodNameLookup = {
    'post'  : 'POST',
    'put'   : 'PUT',
    'patch' : 'PATCH',
    'head'  : 'HEAD',
    'del'   : 'DELETE',
    'get'   : 'GET'
};

Object.keys(request).filter(function(key){
    return typeof(request[key]) === "function" && !wrapMethods.indexOf(key) +1;
}).forEach(function(key){
    rp[key] = request[key].bind(request);
});

Object.keys(request).filter(function(key){
    return typeof(request[key]) === "function" && wrapMethods.indexOf(key) +1;
}).forEach(function(key){
    rp[key] = defaultHttpMethod;
});

function defaultHttpMethod(){
    var args = Array.prototype.slice.call(arguments, 0);
    var params = request.initParams.apply(request, args);
    params.method = methodNameLookup[key];
    return buildPromise(params);
}

module.exports = rp;
