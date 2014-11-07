'use strict';

var rp = require('../lib/rp.js');
var http = require('http');
var url = require('url');
var util = require('util');

describe('Request-Promise', function () {
    var server;

    before(function(){
        // This creates a local server to test for various status codes. A request to /404 returns a 404, etc
        server = http.createServer(function(request, response){
            var path = url.parse(request.url).pathname;
            var status = parseInt(path.split('/')[1]);
            if(isNaN(status)) { status = 555; }
            response.writeHead(status);
            response.end(request.method + ' ' + request.url);
        });
        server.listen(4000);
    });

    after(function(){
        server.close();
    });

    it('should resolve for 200 status code', function (done) {
        rp('http://localhost:4000/200')
            .then(function(){
                done();
            }).catch(function(){
                done(new Error('A 200 response should resolve, not reject'));
            });
    });

    it('should resolve for 201 status code', function (done) {
        rp('http://localhost:4000/201')
            .then(function(){
                done();
            }).catch(function(){
                done(new Error('A 201 response should resolve, not reject'));
            });
    });

    it('should resolve for 204 status code', function (done) {
        rp('http://localhost:4000/204')
            .then(function(){
                done();
            }).catch(function(){
                done(new Error('A 204 response should resolve, not reject'));
            });
    });

    it('should reject for http errors', function(done){
        rp('http://localhost:1/200')
            .then(function(){
                done(new Error('A failed request should reject, not resolve'));
            }).catch(function(){
                done();
            });
    });

    it('should accept the method in wrong case', function (done) {

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

    describe('simple tests', function(){

        it('should reject for 404 status code', function (done) {
            rp('http://localhost:4000/404')
                .then(function () {
                    done(new Error('A 404 response code should reject, not resolve'));
                }).catch(function(){
                    done();
                });
        });

        it('should reject for 500 status code', function (done) {
            rp('http://localhost:4000/500')
                .then(function(){
                    done(new Error('A 500 response code should reject, not resolve'));
                }).catch(function(){
                    done();
                });
        });

    });

    describe('simple tests with changing options object', function(){


        it('should reject for 500 status code', function (done) {
            var options = {
                uri : 'http://localhost:4000/500', // UR - I -
                method : 'GET',
                simple : true
            };

            rp('http://localhost:4000/500')
                .then(function(){
                    done(new Error('A 500 response code should reject, not resolve'));
                }).catch(function(){
                    done();
                });
        });

        it('should resolve for 200 status code', function (done) {
            var options = {
                url : 'http://localhost:4000/200', // UR - L -
                method : 'GET',
                simple : true
            };

            rp(options)
                .then(function(){
                    done();
                }).catch(function(){
                    done(new Error('A 200 response should resolve, not reject'));
                });
        });

    });

    describe('non-simple tests', function(){

        it('should resolve for 404 status code', function(done){
            var options = {
                url: 'http://localhost:4000/404',
                simple: false
            };
            rp(options)
                .then(function(){
                    done();
                }).catch(function(){
                    done(new Error('A 404 response code should resolve, not reject'));
                });
        });

        it('should resolve for 500 status code', function(done){
            var options = {
                url: 'http://localhost:4000/500',
                simple: false
            };
            rp(options)
                .then(function(){
                    done();
                }).catch(function(){
                    done(new Error('A 500 response code should resolve, not reject'));
                });
        });

    });


    describe('HTTP methods', function(){
        it('should support PATCH', function(done){
            var options = {
                url: 'http://localhost:4000/200',
                method: 'PATCH'
            };
            rp(options)
                .then(function(){
                    done();
                }).catch(function(){
                    done(new Error('A 200 response code for a PATCH request should resolve, not reject'));
                });
        });

        it('should support DELETE', function(done){
            var options = {
                url: 'http://localhost:4000/200',
                method: 'DELETE'
            };
            rp(options)
                .then(function(){
                    done();
                }).catch(function(){
                    done(new Error('A 200 response code for a DELETE request should resolve, not reject'));
                });
        });
    });

    describe('with option resolveWithFullResponse', function () {

        it('should include the response', function (done) {
            var options = {
                url: 'http://localhost:4000/200',
                method: 'GET',
                resolveWithFullResponse: true
            };
            rp(options)
                .then(function(response){
                    expect(response.statusCode).to.eql(200);
                    expect(response.request.method).to.eql('GET');
                    expect(response.body).to.eql('GET /200');
                    done();
                }).catch(done);
        });

    });

});
