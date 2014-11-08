'use strict';

var rp = require('../lib/rp.js');
var http = require('http');
var url = require('url');
var Bluebird = require('bluebird');


describe('Request-Promise', function () {

    var server, lastResponseBody;

    before(function (done) {
        // This creates a local server to test for various status codes. A request to /404 returns a 404, etc
        server = http.createServer(function(request, response){
            var path = url.parse(request.url).pathname;
            var status = parseInt(path.split('/')[1]);
            if(isNaN(status)) { status = 555; }
            response.writeHead(status);
            lastResponseBody = request.method + ' ' + request.url;
            response.end(lastResponseBody);
        });
        server.listen(4000, function () {
            done();
        });
    });

    after(function () {
        // Wait for all requests to finish since they may produce unhandled errors for tests at the end that don't wait themselves.
        setTimeout(function () {
            server.close();
        }, 20);
    });


    describe('should reject HTTP errors', function () {

        it('like an unreachable host', function () {
            return expect(rp('http://localhost:1/200')).to.be.rejected;
        });

    });

    describe('should handle status codes', function () {

        it('by resolving a 200', function () {
            return expect(rp('http://localhost:4000/200')).to.be.fulfilled;
        });

        it('by resolving a 201', function () {
            return expect(rp('http://localhost:4000/201')).to.be.fulfilled;
        });

        it('by resolving a 204', function () {
            return expect(rp('http://localhost:4000/204')).to.be.fulfilled;
        });

        describe('with options.simple = true', function(){

            it('by rejecting a 404', function () {
                return expect(rp('http://localhost:4000/404')).to.be.rejected;
            });

            it('by rejecting a 500', function () {
                return expect(rp('http://localhost:4000/500')).to.be.rejected;
            });

        });

        describe('with options.simple = false', function(){

            it('by resolving a 404', function (){
                var options = {
                    url: 'http://localhost:4000/404',
                    simple: false
                };
                return expect(rp(options)).to.be.fulfilled;
            });

            it('by resolving a 500', function (){
                var options = {
                    url: 'http://localhost:4000/500',
                    simple: false
                };
                return expect(rp(options)).to.be.fulfilled;
            });

        });

    });

    describe('should provide a detailed reject reason', function () {

        it('when erroring out', function (done) {

            var expectedOptions = {
                uri: 'http://localhost:1/200',
                simple: true,
                resolveWithFullResponse: false,
                tunnel: false,
                callback: undefined
            };

            rp('http://localhost:1/200')
                .then(function () {
                    done(new Error('Request should have errored out!'));
                })
                .catch(function (reason) {
                    expect(reason).to.be.an('object');
                    expect(reason.error.message).to.eql('connect ECONNREFUSED');
                    expect(reason.options).to.eql(expectedOptions);
                    expect(reason.response).to.eql(undefined);
                    expect(reason.statusCode).to.eql(undefined);
                    done();
                })
                .catch(done);

        });

        it('when getting a non-success status code', function (done) {

            var expectedOptions = {
                uri: 'http://localhost:4000/404',
                simple: true,
                resolveWithFullResponse: false,
                tunnel: false,
                callback: undefined
            };

            rp('http://localhost:4000/404')
                .then(function () {
                    done(new Error('Request should have errored out!'));
                })
                .catch(function (reason) {
                    expect(reason).to.be.an('object');
                    expect(reason.error).to.eql('GET /404');
                    expect(reason.options).to.eql(expectedOptions);
                    expect(reason.response).to.be.an('object');
                    expect(reason.response.body).to.eql('GET /404');
                    expect(reason.statusCode).to.eql(404);
                    done();
                })
                .catch(done);

        });

    });

    describe('should process the options', function () {

        it('by correcting options.method with wrong case', function (done) {

            rp({ uri: 'http://localhost:4000/500', method: 'Get' })
                .then(function () {
                    done(new Error('A 500 response code should reject, not resolve'));
                }).catch(function (reason) {
                    expect(reason.options.method).to.eql('GET');
                    expect(reason.error).to.eql('GET /500');
                    done();
                })
                .catch(done);

        });

        it('falling back to the default for a non-boolean options.simple', function () {
            return expect(rp({ url: 'http://localhost:4000/404', simple: 0 })).to.be.rejected;
        });

        it('falling back to the default for a non-boolean options.resolveWithFullResponse', function () {
            return rp({ url: 'http://localhost:4000/200', resolveWithFullResponse: 1 })
                .then(function (body) {
                    expect(body).to.eql('GET /200');
                });
        });

        it('by not cross-polluting the options of later requests', function () {

            return Bluebird.resolve()
                .then(function () {

                    var options = {
                        uri : 'http://localhost:4000/500', // UR - I -
                        method : 'GET',
                        simple : true
                    };

                    return expect(rp(options), 'First request').to.be.rejected;

                })
                .then(function () {

                    var options = {
                        url : 'http://localhost:4000/200', // UR - L -
                        method : 'GET',
                        simple : true
                    };

                    return expect(rp(options), 'Second request').to.be.fulfilled;

                });

        });

        it('by not cross-polluting the options of parallel requests', function () {

            return Bluebird.all([
                    rp({ uri: 'http://localhost:4000/200', simple: true }),
                    rp({ url: 'http://localhost:4000/500', simple: false }),
                    rp({ url: 'http://localhost:4000/201', resolveWithFullResponse: true })
                ])
                .then(function (results) {
                    expect(results[0]).to.eql('GET /200');
                    expect(results[1]).to.eql('GET /500');
                    expect(results[2].body).to.eql('GET /201');
                });

        });

        it('resolveWithFullResponse = true', function () {

            var options = {
                url: 'http://localhost:4000/200',
                method: 'GET',
                resolveWithFullResponse: true
            };

            return rp(options)
                .then(function(response){
                    expect(response.statusCode).to.eql(200);
                    expect(response.request.method).to.eql('GET');
                    expect(response.body).to.eql('GET /200');
                });

        });

    });

    describe('should apply a transform function', function () {

        it('that processes the body', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: function (body) {
                    return body.split('').reverse().join('');
                }
            };

            return rp(options)
                .then(function (transformedResponse) {
                    expect(transformedResponse).to.eql('002/ TEG');
                });

        });

        it('that processes the full response', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: function (body, httpResponse) {
                    return httpResponse.body.split('').reverse().join('');
                }
            };

            return rp(options)
                .then(function (transformedResponse) {
                    expect(transformedResponse).to.eql('002/ TEG');
                });

        });

        it('that returns a promise', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: function (body) {
                    return new Bluebird(function (resolve) {
                        setTimeout(function () {
                            resolve(body.split('').reverse().join(''));
                        });
                    });
                }
            };

            return rp(options)
                .then(function (transformedResponse) {
                    expect(transformedResponse).to.eql('002/ TEG');
                });

        });

        it('that returns a rejected promise', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: function (body) {
                    return new Bluebird(function (resolve, reject) {
                        setTimeout(function () {
                            reject(new Error('Transform rejected!'));
                        });
                    });
                }
            };

            return expect(rp(options)).to.be.rejected;

        });

        it('that throws an exception', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: function (body) {
                    throw new Error('Transform failed!');
                }
            };

            return rp(options)
                .then(function (transformedResponse) {
                    throw new Error('Request should not have been fulfilled!');
                })
                .catch(function (err) {
                    expect(err.message).to.eql('Transform failed!');
                });

        });

        it('not if options.transform is not a function', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: {}
            };

            return rp(options)
                .then(function (transformedResponse) {
                    expect(transformedResponse).to.eql('GET /200');
                });

        });

    });

    describe('should cover the HTTP method shortcuts', function () {

        it('rp.get', function () {
            return expect(rp.get('http://localhost:4000/200')).to.eventually.eql('GET /200');
        });

        it('rp.head', function () {

            var options = {
                url: 'http://localhost:4000/200',
                resolveWithFullResponse: true
            };

            return rp.head(options)
                .then(function (response) {
                    expect(response.statusCode).to.eql(200);
                    expect(response.request.method).to.eql('HEAD');
                    expect(response.body).to.eql('');
                });

        });

        it('rp.post', function () {
            return expect(rp.post('http://localhost:4000/200')).to.eventually.eql('POST /200');
        });

        it('rp.put', function () {
            return expect(rp.put('http://localhost:4000/200')).to.eventually.eql('PUT /200');
        });

        it('rp.patch', function () {
            return expect(rp.patch('http://localhost:4000/200')).to.eventually.eql('PATCH /200');
        });

        it('rp.del', function () {
            return expect(rp.del('http://localhost:4000/200')).to.eventually.eql('DELETE /200');
        });

    });

    describe('defaults', function () {}); // TODO
    describe('examples in readme', function () {}); // TODO

    describe('should still allow a callback', function () {

        it('without using the then method', function (done) {

            rp('http://localhost:4000/200', function (err, httpResponse, body) {

                try {

                    if (err) { throw err; }
                    expect(body).to.eql('GET /200');
                    done();

                } catch (e) {
                    done(e);
                }

            });

        });

        it('with using the then method at the same time', function () {

            var callOrder = 0;

            return new Bluebird(function (resolve, reject) {

                var callback = function (err, httpResponse, body) {

                    try {
                        if (err) { throw err; }
                        expect(body).to.eql('GET /200');
                        expect(callOrder).to.eql(0);
                        callOrder += 1;
                    } catch (e) {
                        reject(e);
                    }

                };

                rp('http://localhost:4000/200', callback)
                    .then(function (body) {
                        expect(body).to.eql('GET /200');
                        expect(callOrder).to.eql(1);
                        callOrder += 1;
                        resolve();
                    });

            });

        });

        it('and still work if the callback throws an exception', function () {

            return new Bluebird(function (resolve, reject) {

                var callback = function (err, httpResponse, body) {
                    throw new Error();
                };

                rp('http://localhost:4000/200', callback)
                    .then(function (body) {
                        expect(body).to.eql('GET /200');
                        resolve();
                    });

            });

        });

        it('without using the then method and no callback provided', function (done) {

            rp('http://localhost:4000/234'); // 234 is only used here.

            setTimeout(function () {
                if (lastResponseBody !== 'GET /234') {
                    done (new Error('The server did not receive the request!'));
                } else {
                    done();
                }
            }, 20);

        });

    });

    describe('should be Promises/A+ compliant', function () {

        it('and allow calling then after the request already finished', function (done) {

            var req = rp('http://localhost:4000/200');

            setTimeout(function () {
                req.then(function () {
                    done();
                });
            }, 20);

        });

        it('and take only a fulfilled handler', function (done) {

            rp('http://localhost:4000/200')
                .then(function () {
                    done();
                });

        });

        it('and take only a rejected handler', function (done) {

            rp('http://localhost:4000/404')
                .then(null, function () {
                    done();
                });

        });

        it('by allowing chaining another then', function (done) {

            rp('http://localhost:4000/200')
                .then(function () {
                })
                .then(function () {
                    done();
                });

        });

        it('by allowing chaining another then for rejection', function (done) {

            rp('http://localhost:4000/404')
                .then(function () {
                })
                .then(null, function () {
                    done();
                });

        });

        it('by allowing chaining a catch', function (done) {

            rp('http://localhost:4000/404')
                .then(function () {
                })
                .catch(function () {
                    done();
                });

        });

        it('and allow the then method to be invoked more than once', function (done) {

            var countFulfillCalls = 0;

            function onFulfilled() {
                countFulfillCalls += 1;
                if (countFulfillCalls === 3) {
                    done();
                }
            }

            var req = rp('http://localhost:4000/200');

            req.then(onFulfilled);
            req.then(onFulfilled);
            req.then(onFulfilled);

        });

    });

});
