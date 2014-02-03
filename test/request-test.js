var rp = require('../lib/rp.js');
var http = require('http');
var url = require('url');
var assert = require('assert');


describe('request tests', function () {
    var server;

    before(function(){
        // This creates a local server to test for various status codes. A request to /404 returns a 404, etc
        server = http.createServer(function(request, response){
            var path = url.parse(request.url).pathname;
            var status = parseInt(path.split('/')[1]);
            if(isNaN(status)) status = 555;
            response.writeHead(status);
            response.end();
        });
        server.listen(4000);
    });

    after(function(){
        server.close();
    })

    it('should resolve for 200 status code', function (done) {
        rp('http://localhost:4000/200')
            .then(function(){
                done();
            }).catch(function(){
                done(new Error('A 200 response should resolve, not reject'));
            });
    });

    it('should reject for http errors', function(done){
        rp('http://localhost:1/200')
            .then(function(){
                done(new Error('A failed request should reject, not resolve'))
            }).catch(function(){
                done();
            });
    })

    describe('simple tests', function(){

        it('should reject for 500 status code', function (done) {
            rp('http://localhost:4000/500')
                .then(function(){
                    done(new Error('A 500 response code should reject, not resolve'));
                }).catch(function(){
                    done();
                });
        });

    });

    describe('non-simple tests', function(){
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
        })
    })

});