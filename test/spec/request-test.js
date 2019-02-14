'use strict';

var childProcess = require('child_process'),
    errors = require('../../errors'),
    path = require('path'),
    rp = require('../../'),
    tough = require('tough-cookie'),
    startServer = require('../fixtures/server.js');


describe('Request-Promise', function () {

    var stopServer = null;

    before(function (done) {

        startServer(4000, function (stop) {
            stopServer = stop;
            done();
        });

    });

    after(function (done) {

        stopServer(done);

    });

    describe('should expose', function () {

        it('.then(...)', function (done) {

            rp('http://localhost:4000/200')
                .then(function (body) {
                    expect(body).to.eql('GET /200');
                    done();
                })
                .catch(function (err) {
                    done(err);
                });

        });

        it('.catch(...) and the error types', function (done) {

            rp('http://localhost:4000/404')
                .catch(function (err) {
                    expect(err instanceof errors.StatusCodeError).to.eql(true);
                    return 'catch called';
                })
                .then(function (info) {
                    expect(info).to.eql('catch called');
                    done();
                })
                .catch(function (err) {
                    done(err);
                });

        });

        it('.finally(...)', function (done) {

            var finallyWasCalled = false;

            rp('http://localhost:4000/200')
                .finally(function (body) {
                    finallyWasCalled = true;
                })
                .then(function () {
                    expect(finallyWasCalled).to.eql(true);
                    done();
                });

        });

        it('.promise() returning a Bluebird promise', function () {

            var p = rp('http://localhost:4000/200').promise();

            // This will not actually be an instanceof Bluebird since request-promise creates a new Bluebird copy.
            // Instead, verify that the Promise contains the bluebird functions.
            expect(p.constructor.name).to.equal('Promise');
            expect(p.then).to.be.a('function');
            expect(p.delay).to.be.a('function');
            expect(p.map).to.be.a('function');
            expect(p.cancel).to.be.a('function');

        });

        it('.cancel() cancelling the Bluebird promise and aborting the request', function (done) {

            var req = rp('http://localhost:4000/503');
            req.once('abort', done);

            req.cancel();

        });

        it('.cancel() on promises chained from the Bluebird promise, aborting the request', function (done) {

            var req = rp('http://localhost:4000/503');
            req.once('abort', done);

            req.then(function noop() { }).cancel();

        });

    });

    describe('should still allow to require Request independently', function () {

        it('by not interfering with Request required afterwards', function (done) {

            childProcess.exec('node ' + path.join(__dirname, '../fixtures/require/afterwards.js'), function (err, stdout, stderr) {

                if (err) {
                    done(err);
                    return;
                }

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

                if (err) {
                    done(err);
                    return;
                }

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

                if (err) {
                    done(err);
                    return;
                }

                try {
                    expect(stdout, 'Actual stdout: ' + stdout).to.contain('request1: true, rp: true, request2: true');
                    done();
                } catch (e) {
                    done(e);
                }

            });

        });

    });

    it('should inform about the dropped CLS support', function () {

        expect(function () {
            rp.bindCLS();
        }).to.throw();

    });

    it('should not resolve the promise if .abort() is used', function (done) {

        var request = rp('http://localhost:4000/200');

        request.promise()
            .finally(function () {
                done(new Error('The promise should not be resolved'));
            });

        request.abort();

        setTimeout(done, 100);

    });

    it('should allow the use of tough-cookie - issue #183', function () {

        var sessionCookie = new tough.Cookie({
            key: 'some_key',
            value: 'some_value',
            domain: 'api.mydomain.com',
            httpOnly: true,
            maxAge: 31536000
        });

        var cookiejar = rp.jar();

        expect(function () {
            cookiejar.setCookie(sessionCookie.toString(), 'https://api.mydomain.com');
        }).to.not.throw();

    });

});
