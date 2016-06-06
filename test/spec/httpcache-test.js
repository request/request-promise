'use strict';

var rp = require('../../lib/rp.js');
var http = require('http');
var url = require('url');
var bodyParser = require('body-parser');
var moment = require('moment');

var LAST_MODIFIED_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss z';


describe('Request-Promise', function () {
    describe('HTTP 1.1 Cache Implementation', function () {
        var cacheServer;
        var now = moment().format(LAST_MODIFIED_FORMAT);

        var resources = [
            {
                headers: {
                    'Last-Modified': now,
                    'Cache-Control': 'public, max-age=10',
                    'Content-Type': 'application/json',
                    'Etag': 'resource_1'
                },
                content: {
                    name: 'resource_1'
                }
            },
            {
                headers: {
                    'Last-Modified': now,
                    'Etag': 'resource_2',
                    'Content-Type': 'application/json'
                },
                content: {
                    name: 'resource_2'
                }
            },
            {
                headers: {
                    'Last-Modified': now,
                    'Etag': 'resource_3',
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/json'
                },
                content: {
                    name: 'resource_3'
                }
            },
            {
                headers: {
                    'Last-Modified': now,
                    'Etag': 'resource_4',
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/json',
                },
                content: {
                    name: 'resource_4'
                }
            },
            {
                headers: {
                    'Last-Modified': now,
                    'Etag': 'resource_5',
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/json',
                },
                content: {
                    name: 'resource_5'
                }
            },
            {
                headers: {
                    'Last-Modified': now,
                    'Etag': 'resource_6',
                    'Cache-Control': 'public, max-age=30',
                    'Content-Type': 'application/json',
                    'age': 20
                },
                content: {
                    name: 'resource_6'
                }
            },
            {
                headers: {
                    'Last-Modified': now,
                    'Cache-Control': 'public, max-age=10',
                    'Content-Type': 'application/json',
                    'Etag': 'resource_7'
                },
                content: {
                    name: 'resource_7'
                }
            },


        ];
        var resourceOrigin = JSON.parse(JSON.stringify(resources));

        // Increase Last-Modifier counter
        var incrementLastModified = function (resource) {
            var newDate = moment(resource.headers['Last-Modified'], LAST_MODIFIED_FORMAT).add(5, 'seconds');
            resource.headers['Last-Modified'] = newDate.toString();
            return resource.headers['Last-Modified'];
        };

        // Helper method to assert cached requests
        var assertResponse = function(response, statusCode, content, lastModified, age) {
            var headers = response.headers;

            // console.info("\nResponse Headers: \n", response.headers);

            expect(response.statusCode).to.eql(statusCode);
            expect(JSON.parse(response.body).name).to.eql(content);
            expect(headers['last-modified']).to.eql(lastModified);

            if (typeof age === 'undefined') {
                expect(typeof headers.age === 'undefined').to.eql(true);
            } else if (age === 0) {
                expect(parseInt(headers['age'])).to.eql(0);
            } else {
                expect(parseInt(headers['age']) > 0).to.eql(true);
            }
        };

        var changeResource = function(resource) {
            resource.content.name += 'salt';
            resource.headers['Etag'] = resource.content.name + 'salt';
        };

        before(function (done) {
            // This creates a local cache server to test cache behavior of the lib
            cacheServer = http.createServer(function (request, response) {
                (bodyParser.json())(request, response, function () {
                    var index = parseInt(url.parse(request.url).pathname.substr(1).split('_')[1]) - 1;
                    var resource = resources[index];

                    if (resource) {
                        var inm = request.headers['if-none-match'];
                        var ims = request.headers['if-modified-since'];

                        if (inm && inm === resource.headers['Etag']) {
                            response.writeHead(304);
                            response.end();
                            return;
                        }

                        if (ims && ims !== resource.headers['Last-Modified']) {
                            response.writeHead(304);
                            response.end();
                            return;
                        }

                        response.writeHead(200, resource.headers);
                        response.end(JSON.stringify(resource.content));
                    } else {
                        response.writeHead(404);
                        response.end('');
                    }
                });
            });

            cacheServer.listen(5000, function () {
                done();
            });
        });

        beforeEach(function() {
            resources = JSON.parse(JSON.stringify(resourceOrigin));
        });

        after(function () {
            cacheServer.close();
        });

        beforeEach(function () {
            // Require a fresh lib
            delete require.cache[require.resolve('../../lib/rp.js')];
            rp = require('../../lib/rp.js');
        });

        it('should cache resource with: cache-control, cache option = true', function (done) {
            var options = {
                uri: 'http://localhost:5000/resource_1',
                method: 'GET',
                resolveWithFullResponse: true,
                cache: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_1', now, 0);

                // Change the content to make sure it comes from the cache
                resources[0].content.name = Math.random();

                return rp(options);
            })
            .then(function (response) {
                assertResponse(response, 200, 'resource_1', now, 1);

                // Reset content
                resources[0].content.name = 'resource_1';
                done();
            })
            .catch(done);
        });


        it('should not cache resources with: no cache-control, cache option = true', function (done) {
            var newRandomContent = Math.random();
            var options = {
                uri: 'http://localhost:5000/resource_2',
                method: 'GET',
                resolveWithFullResponse: true,
                cache: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_2', now, 0);

                // Change the content to make sure it doesn't comes from the cache
                resources[1].content.name = newRandomContent;

                return rp(options);
            })
            .then(function (response) {
                assertResponse(response, 200, newRandomContent, now, 0);

                // Reset content
                resources[1].content.name = 'resource_2';
                done();
            })
            .catch(done);
        });

        it('should not cache resources with: cache-control no-cache, cache option = true', function (done) {
            var options = {
                uri: 'http://localhost:5000/resource_3',
                cache: false,
                resolveWithFullResponse: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_3', now, undefined);
                return rp(options);
            }).then(function (response) {
                assertResponse(response, 200, 'resource_3', now, undefined);
                done();
            }).catch(done);
        });

        it('should not cache resources with: cache-control, cache option = false', function (done) {
            var options = {
                uri: 'http://localhost:5000/resource_1',
                resolveWithFullResponse: true,
                cache: false
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_1', now);

                return rp(options);
            })
            .then(function (response) {
                assertResponse(response, 200, 'resource_1', now);
                done();
            })
            .catch(done);
        });


        it('should cache resource and deliver cached version regardless of Last-Modified changes', function (done) {
            //
            // @TODO Test isn't well isolated
            //       Resource is already cached because of very first executed test
            //

            var options = {
                uri: 'http://localhost:5000/resource_1',
                resolveWithFullResponse: true,
                cache: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_1', now, true);
                incrementLastModified(resources[0]);    // Age is still going to be smaller than max-age

                return rp(options);
            })
            .then(function (response) {
                assertResponse(response, 200, 'resource_1', now, true);
                done();
            })
            .catch(done);
        });

        it('should cache resource and deliver a fresh resource (invalidation through Last-Modified)', function (done) {
            this.timeout(11000);

            var options = {
                uri: 'http://localhost:5000/resource_4',
                resolveWithFullResponse: true,
                cache: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_4', now, 0);
                var later = incrementLastModified(resources[3]);

                console.log('waiting (6s) for resource to expire...');
                setTimeout(function () {
                    rp(options).then(function (response) {
                        assertResponse(response, 200, 'resource_4', later, 0);
                        done();
                    });
                }, 6000);
            })
            .catch(done);
        });

        it('should cache resource and further deliver the stale because neither last-modified nor etag has changed (conditional request returns 304)', function (done) {
            this.timeout(30000);

            var options = {
                uri: 'http://localhost:5000/resource_7',
                resolveWithFullResponse: true,
                cache: true,
                simple: false
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_7', now, 0);
                // change content
                resources[0].content.name = 'resource_7_salt';

                console.log('waiting (11s) for resource to expire...');
                setTimeout(function () {
                    rp(options).then(function (response) {
                        // content should still be resource_7 because conditional requests should
                        // return 304
                        // age is reset to 0 by the cache in that case
                        assertResponse(response, 200, 'resource_7', now, 0);
                        done();
                    });
                }, 11000);
            })
            .catch(done);
        });


        it('should cache resource and deliver a fresh resource (invalidation through ETag)', function (done) {
            this.timeout(11000);

            var options = {
                uri: 'http://localhost:5000/resource_5',
                method: 'GET',
                resolveWithFullResponse: true,
                cache: true
            };

            rp(options).then(function(response){
                assertResponse(response, 200, 'resource_5', now, 0);

                // change the ETag
                changeResource(resources[4]);
                console.log('waiting (6s) for resource to expire...');
                setTimeout(function() {
                    rp(options).then(function(response){
                        assertResponse(response, 200, 'resource_5salt', now, 0);
                        done();
                    });
                }, 6000);
            });

        });

        it('should cache resource and deliver a fresh resource not incremented (invalidation)', function (done) {
            this.timeout(20000);

            var options = {
                uri: 'http://localhost:5000/resource_1',
                method: 'GET',
                cache: true,
                resolveWithFullResponse: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_1', now, 0);
                console.log('waiting (11s) for resource to expire...');
                setTimeout(function() {
                    rp(options).then(function (response) {
                        assertResponse(response, 200, 'resource_1', now, 0);
                        done();
                    });
                }, 11000);
            });
        });

        it('should cache resource and deliver a fresh resource (invalidation)', function (done) {
            this.timeout(11000);

            var options = {
                uri: 'http://localhost:5000/resource_6',
                method: 'GET',
                cache: true,
                resolveWithFullResponse: true
            };

            rp(options).then(function (response) {
                assertResponse(response, 200, 'resource_6', now, 20);

                rp(options).then(function (response) {
                    expect(response.statusCode).to.eql(200);
                    expect(response.headers['last-modified']).to.eql(now);
                    expect(parseInt(response.headers['age']) > 20).to.eql(true);
                    done();
                });
            });
        });
    });
});
