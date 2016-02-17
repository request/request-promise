'use strict';

var rp = require('../../lib/rp.js');
var errors = require('../../errors.js');
var http = require('http');
var url = require('url');
var Bluebird = require('bluebird');
var childProcess = require('child_process');
var path = require('path');
var es = require('event-stream');
var bodyParser = require('body-parser');


describe('Request-Promise', function () {

    var server, lastResponseBody;

    before(function (done) {
        // This creates a local server to test for various status codes. A request to /404 returns a 404, etc
        server = http.createServer(function (request, response) {
            (bodyParser.json())(request, response, function () {
                var path = url.parse(request.url).pathname;
                var status = parseInt(path.split('?')[0].split('/')[1]);
                if(isNaN(status)) { status = 555; }
                if (status === 302) {
                    response.writeHead(status, { location: '/200' });
                    lastResponseBody = '';
                    response.end();
                } else if (status === 222) {
                    response.writeHead(status, { 'Content-Type': 'text/html' });
                    response.end('<html><head></head><body></body></html>');
                } else {
                    response.writeHead(status, { 'Content-Type': 'text/plain' });
                    var body = (request.method === 'POST' && JSON.stringify(request.body) !== '{}' ? ' - ' + JSON.stringify(request.body) : '');
                    lastResponseBody = request.method + ' ' + request.url + body;
                    response.end(lastResponseBody);
                }
            });
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
                transform: undefined
            };

            rp('http://localhost:1/200')
                .then(function () {
                    done(new Error('Request should have errored out!'));
                })
                .catch(function (reason) {
                    expect(reason).to.be.an('object');
                    expect(typeof reason).to.eql('object'); // Just double checking
                    expect(reason.error.message).to.contain('connect ECONNREFUSED');
                    delete reason.options.callback; // Even out Request version differences.
                    expect(reason.options).to.eql(expectedOptions);
                    expect(reason.response).to.eql(undefined);
                    expect(reason.statusCode).to.eql(undefined);

                    // Test for Error type introduced in 0.4
                    expect(reason instanceof errors.RequestError).to.eql(true);
                    expect(reason.name).to.eql('RequestError');
                    expect(reason.message).to.contain('connect ECONNREFUSED');
                    expect(reason.cause).to.eql(reason.error);

                    throw reason; // Testing Bluebird's catch by type
                })
                .catch(errors.RequestError, function (reason) {
                    done();
                })
                .catch(done);

        });

        it('when getting a non-success status code', function (done) {

            var expectedOptions = {
                uri: 'http://localhost:4000/404',
                simple: true,
                resolveWithFullResponse: false,
                transform: undefined
            };

            rp('http://localhost:4000/404')
                .then(function () {
                    done(new Error('Request should have errored out!'));
                })
                .catch(function (reason) {
                    expect(reason).to.be.an('object');
                    expect(typeof reason).to.eql('object'); // Just double checking
                    expect(reason.error).to.eql('GET /404');
                    delete reason.options.callback; // Even out Request version differences.
                    expect(reason.options).to.eql(expectedOptions);
                    expect(reason.response).to.be.an('object');
                    expect(reason.response.body).to.eql('GET /404');
                    expect(reason.statusCode).to.eql(404);

                    // Test for Error type introduced in 0.4
                    expect(reason instanceof errors.StatusCodeError).to.eql(true);
                    expect(reason.name).to.eql('StatusCodeError');
                    expect(reason.statusCode).to.eql(404);
                    expect(reason.message).to.eql('404 - GET /404');

                    throw reason; // Testing Bluebird's catch by type
                })
                .catch(errors.StatusCodeError, function (reason) {
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

        it('for HEAD by default', function () {

            return rp.head('http://localhost:4000/200')
                .then(function (transformedResponse) {
                    expect(transformedResponse['content-type']).to.eql('text/plain');
                });

        });

        it('but still letting to overwrite the default transform for HEAD', function () {

            var options = {
                url: 'http://localhost:4000/200',
                transform: function () {
                    return 'test';
                }
            };

            return rp.head(options)
                .then(function (transformedResponse) {
                    expect(transformedResponse).to.eql('test');
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

    describe('should cover the defaults mechanism', function () {

        it("for overwriting the simple property's default", function () {

            var nonSimpleRP = rp.defaults({ simple: false });

            return expect(nonSimpleRP('http://localhost:4000/404')).to.be.fulfilled;

        });

        it("for overwriting the resolveWithFullResponse property's default", function () {

            var rpWithFullResp = rp.defaults({ resolveWithFullResponse: true });

            return rpWithFullResp('http://localhost:4000/200')
                .then(function (response) {
                    expect(response.statusCode).to.eql(200);
                });

        });

        if (process.env.V_REQUEST !== '2.34.0') { // Was never supported in this version so fixing it wouldn't make sense.

            it('for cascading overwrites', function () {

                var nonSimpleRP = rp.defaults({ simple: false });
                var nonSimpleRPWithFullResp = nonSimpleRP.defaults({ resolveWithFullResponse: true });

                return nonSimpleRPWithFullResp('http://localhost:4000/404')
                    .then(function (response) {
                        expect(response.statusCode).to.eql(404);
                    });

            });

        }

        it('and not interfere with the original Request-Promise instance', function () {

            var rpWithFullResp = rp.defaults({ resolveWithFullResponse: true });

            return Bluebird.all([
                    rpWithFullResp('http://localhost:4000/200'),
                    rp('http://localhost:4000/200')
                ])
                .then(function (results) {
                    expect(results[0].statusCode).to.eql(200);
                    expect(results[1]).to.eql('GET /200');
                });

        });

        it('for setting the transform property', function () {

            var rpWithTransform = rp.defaults({ transform: function (body) { return body.split('/'); }});

            return rpWithTransform('http://localhost:4000/200')
                .then(function (body) {
                    expect(body).to.eql(['GET ', '200']);
                });

        });

    });

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

        it('and still work if the callback throws an exception', function (done) {

            var callback = function (err, httpResponse, body) {
                throw new Error();
            };

            var originalErrorListeners = process.domain.listeners('error');
            process.domain.removeAllListeners('error');

            var errorCount = 0;
            process.domain.on('error', function () {
                errorCount += 1;
            });

            rp('http://localhost:4000/200', callback)
                .then(function (body) {

                    process.domain.removeAllListeners('error');
                    for ( var i = 0; i < originalErrorListeners.length; i+=1 ) {
                        process.domain.on('error', originalErrorListeners[i]);
                    }

                    expect(errorCount).to.eql(1);
                    expect(body).to.eql('GET /200');
                    done();

                })
                .catch(done);

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

    describe('should expose additional Bluebird methods', function () {

        it('.catch(Function handler)', function (done) {

            rp('http://localhost:4000/404')
                .catch(function (reason) {
                    done();
                });

        });

        it('.catch([Function ErrorClass|Function predicate...], Function handler)', function (done) {

            rp({ uri: 'http://localhost:4000/200', transform: function () { throw new Error('Transform failed.'); } })
                .catch(Error, function (err) {
                    done();
                })
                .catch(function (reason) {
                    done(new Error('Expected rejection reason to be an Error object.'));
                });

        });

        it('.finally(Function handler)', function (done) {

            rp('http://localhost:4000/200')
                .finally(function () {
                    done();
                });

        });

        it('.promise() to return the Bluebird promise itself', function () {

            var context = { message: 'Hello World!'};

            return rp('http://localhost:4000/200').promise().bind(context)
                .then(function (body) {
                    expect(body).to.eql('GET /200');
                    expect(this).to.eql(context);
                });

        });

    });

    describe('should handle possibly unhandled rejections', function () {

        var origStderrWrite, stderr;

        beforeEach(function () {
            origStderrWrite = process.stderr.write;
            stderr = [];
            process.stderr.write = function(string, encoding, fd) {
                stderr.push(string);
            };
        });

        afterEach(function () {
            process.stderr.write = origStderrWrite;
        });

        it('by printing them if .then(...) was not called yet', function (done) {

            rp('http://localhost:1/200', function (err) {
                if (!err) {
                    done(new Error('The request should fail.'));
                    return;
                }
                setTimeout(function () {
                    if (stderr.length === 0) {
                        done(new Error('Observed no output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);
            });

        });

        it('by printing them if .then(...) was called without a rejection handler', function (done) {

            rp('http://localhost:1/200', function (err) {
                if (!err) {
                    done(new Error('The request should fail.'));
                    return;
                }
                setTimeout(function () {
                    if (stderr.length === 0) {
                        done(new Error('Observed no output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);
            }).then(function () {}, null); // No rejection handler

        });

        it('and also printing them if .promise() was called without any further chaining', function (done) {

            rp('http://localhost:1/200', function (err) {
                if (!err) {
                    done(new Error('The request should fail.'));
                    return;
                }
                setTimeout(function () {
                    if (stderr.length === 0) {
                        done(new Error('Observed no output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);
            }).promise(); // No further chaining

        });

        it('but not printing them if .then(...) was called with a rejection handler', function (done) {

            rp('http://localhost:1/200', function (err) {
                if (!err) {
                    done(new Error('The request should fail.'));
                    return;
                }
                setTimeout(function () {
                    if (stderr.length > 0) {
                        done(new Error('Observed unexpected output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);
            }).then(function () {}, function () {});

        });

        it('and also not printing them if just .catch(...) was called with a rejection handler', function (done) {

            rp('http://localhost:1/200', function (err) {
                if (!err) {
                    done(new Error('The request should fail.'));
                    return;
                }
                setTimeout(function () {
                    if (stderr.length > 0) {
                        done(new Error('Observed unexpected output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);
            }).catch(function () {});

        });

        it('and also not printing them if .promise() was called with a rejection handler given the chain further down', function (done) {

            rp('http://localhost:1/200', function (err) {
                if (!err) {
                    done(new Error('The request should fail.'));
                    return;
                }
                setTimeout(function () {
                    if (stderr.length > 0) {
                        done(new Error('Observed unexpected output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);
            }).promise().catch(function () {});

        });

    });

    describe("should not alter Request's original behavior", function () {

        describe('but also include unhandled rejections', function () {

            var origStderrWrite, stderr;

            beforeEach(function () {
                origStderrWrite = process.stderr.write;
                stderr = [];
                process.stderr.write = function (string, encoding, fd) {
                    stderr.push(string);
                };
            });

            afterEach(function () {
                process.stderr.write = origStderrWrite;
            });

            it('when emitting errors to the callback', function (done) {

                var counter = 2;
                function countDown() {
                    counter -= 1;
                    if (counter === 0) {
                        done();
                    }
                }

                rp({}, function (err) {
                    if (err) {
                        countDown();
                    } else {
                        done(new Error('Observed no output to stderr.'));
                    }
                });

                // Unhandled rejection expected
                setTimeout(function () {
                    if (stderr.length === 0) {
                        done(new Error('Observed no output to stderr.'));
                    } else {
                        countDown();
                    }
                }, 10);

            });

        });

        it('for registering a handler to the emitted complete event', function (done) {
            rp('http://localhost:4000/200')
                .on('complete', function (httpResponse, body) {
                    expect(httpResponse.statusCode).to.eql(200);
                    expect(body).to.eql('GET /200');
                    done();
                });
        });

        it('for piping data while also the promise is used', function (done) {

            var req = rp('http://localhost:4000/200');

            var _data;
            req.pipe(es.wait(function (err, data) {
                    _data = data.toString();
                }));

            req.then(function (body) {
                    expect(body).to.eql('GET /200');
                    expect(_data).to.eql('GET /200');
                    done();
                });

        });

        it('for requests with a redirect', function () {

            return rp('http://localhost:4000/302')
                .then(function (body) {
                    expect(body).to.eql('GET /200');
                });

        });

        it('for passing the data as the second parameter', function (done) {

            rp('http://localhost:4000/200', { method: 'POST', json: { foo: 'bar' } })
                .then(function (body) {
                    expect(body).to.eql('POST /200 - {"foo":"bar"}');
                    done();
                })
                .catch(done);

        });

    });

    describe("should alter Request's original behavior", function () {

        describe('by preferring unhandled rejections', function () {

            var origStderrWrite, stderr;

            beforeEach(function () {
                origStderrWrite = process.stderr.write;
                stderr = [];
                process.stderr.write = function(string, encoding, fd) {
                    stderr.push(string);
                };
            });

            afterEach(function () {
                process.stderr.write = origStderrWrite;
            });

            it('when emitting errors with no listener', function (done) {

                expect(function () {
                    rp({});
                }).to.not.throw();

                // Unhandled rejection expected
                setTimeout(function () {
                    if (stderr.length === 0) {
                        done(new Error('Observed no output to stderr.'));
                    } else {
                        done();
                    }
                }, 10);

            });

        });

    });

    describe('should still allow to require Request independently', function () {

        it('by not interfering with Request required afterwards', function (done) {

            childProcess.exec('node ' + path.join(__dirname, '../fixtures/require/afterwards.js'), function (err, stdout, stderr) {
                try {
                    expect(stdout, 'Actual stdout: ' + stdout).to.contain('rp: true, request: true');
                    done();
                } catch (e) {
                    done(e);
                }
            });

        });

        it('by not interfering with Request required beforehand', function (done) {

            childProcess.exec('node ' + path.join(__dirname, '../fixtures/require/beforehand.js'), function (err, stdout, stderr) {
                try {
                    expect(stdout, 'Actual stdout: ' + stdout).to.contain('request: true, rp: true');
                    done();
                } catch (e) {
                    done(e);
                }
            });

        });

        it('by not interfering with Request required beforehand and afterwards being identical', function (done) {

            childProcess.exec('node ' + path.join(__dirname, '../fixtures/require/beforehandAndAfterwards.js'), function (err, stdout, stderr) {
                try {
                    expect(stdout, 'Actual stdout: ' + stdout).to.contain('request1: true, rp: true, request2: true');
                    done();
                } catch (e) {
                    done(e);
                }
            });

        });

    });

    describe('should support continuation local storage', function () {

        it('with an untouched Bluebird prototype bound to a single namespace', function (done) {

            childProcess.exec('node ' + path.join(__dirname, '../fixtures/cls/single-namespace.js'), function (err, stdout, stderr) {
                try {
                    expect(stdout, 'Actual stdout: ' + stdout).to.contain('2\n');
                    done();
                } catch (e) {
                    done(e);
                }
            });

        });

    });

    describe('should run the examples', function () {

        it('in the Cheat Sheet section of the README', function () {

            this.timeout(10000);

            return Bluebird.resolve()
                .then(function () {

                    return rp('http://localhost:4000/222')
                        .then(function (htmlString) {
                            // Process html...
                            expect(htmlString).to.contain('</html>');
                        })
                        .catch(function (err) {
                            // Crawling failed...
                            throw err;
                        });

                })
                .then(function () {

                    var cheerio = require('cheerio'); // Basically jQuery for node.js

                    var options = {
                        uri: 'http://localhost:4000/222',
                        transform: function (body) {
                            return cheerio.load(body);
                        }
                    };

                    return rp(options)
                        .then(function ($) {
                            // Process html like you would with jQuery...
                            expect($('html').length).to.eql(1);
                        })
                        .catch(function (err) {
                            // Crawling failed or Cheerio choked...
                            throw err;
                        });

                })
                .then(function () {

                    // ### GET something from a JSON REST API

                    var options = {
                        uri: 'http://localhost:4000/200',
                        qs: {
                            access_token: 'xxxxx xxxxx' // -> uri + '?access_token=xxxxx%20xxxxx'
                        },
                        headers: {
                            'User-Agent': 'Request-Promise'
                        },
                        json: true // Automatically parses the JSON string in the response
                    };

                    return rp(options)
                        .then(function (repos) {
                            console.log('User has %d repos', repos.length);
                        })
                        .catch(function (err) {
                            // API call failed...
                            throw err;
                        });

                })
                .then(function () {

                    // ### POST data to a JSON REST API

                    var options = {
                        method: 'POST',
                        uri: 'http://localhost:4000/200',
                        body: {
                            some: 'payload'
                        },
                        json: true // Automatically stringifies the body to JSON
                    };

                    return rp(options)
                        .then(function (parsedBody) {
                            // POST succeeded...
                            expect(parsedBody).to.eql('POST /200 - {"some":"payload"}');
                        })
                        .catch(function (err) {
                            // POST failed...
                            throw err;
                        });

                })
                .then(function () {

                    // ### POST like HTML forms do

                    var options = {
                        method: 'POST',
                        uri: 'http://localhost:4000/200',
                        form: {
                            some: 'payload' // Will be urlencoded
                        },
                        headers: {
                            /* 'content-type': 'application/x-www-form-urlencoded' */ // Set automatically
                        }
                    };

                    return rp(options)
                        .then(function (parsedBody) {
                            // POST succeeded...
                        })
                        .catch(function (err) {
                            // POST failed...
                            throw err;
                        });

                })
                .then(function () {

                    // ### Get the full response instead of just the body

                    var options = {
                        method: 'DELETE',
                        uri: 'http://localhost:4000/200',
                        resolveWithFullResponse: true    //  <---  <---  <---  <---
                    };

                    return rp(options)
                        .then(function (response) {
                            console.log("DELETE succeeded with status %d", response.statusCode);
                            expect(response.statusCode).to.eql(200);
                        })
                        .catch(function (err) {
                            // Delete failed...
                            throw err;
                        });

                })
                .then(function () {

                    // ### Get a rejection only if the request failed for technical reasons

                    var options = {
                        uri: 'http://localhost:4000/404',
                        simple: false,    //  <---  <---  <---  <---
                        resolveWithFullResponse: true
                    };

                    return rp(options)
                        .then(function (response) {
                            // Request succeeded but might as well be a 404
                            // Usually combined with resolveWithFullResponse = true to check response.statusCode
                            expect(response.statusCode).to.eql(404);
                        })
                        .catch(function (err) {
                            // Request failed due to technical reasons...
                            throw err;
                        });

                });

        });

    });

});
