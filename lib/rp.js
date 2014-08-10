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
    return new Promise(function (resolve, reject) {
            request(c, function (error, response, body) {
            if (error) {
                reject(error);
            } else if (c.simple && (statusCodes[c.method].indexOf(response.statusCode) === -1)) {
                reject(response);
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
    rp[key] = function(){
        var args = Array.prototype.slice.call(arguments, 0);
        return new Promise(function (resolve, reject) {
            var method = methodNameLookup[key];
            var params = request.initParams.apply(request, args);
            params.options.method = method;
            request(params, function (error, response, body) {
                if (error) {
                    reject(error);
                } else if (statusCodes[method].indexOf(response.statusCode) === -1) {
                    reject(response);
                } else {
                    if (params.transform && typeof params.transform === 'function') {
                        resolve(params.transform(body));
                    } else {
                        resolve(body);
                    }
                }
            });
        });
    }
});



module.exports = rp;
