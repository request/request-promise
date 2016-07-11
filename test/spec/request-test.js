'use strict';

var Bluebird = require('bluebird'),
    childProcess = require('child_process'),
    errors = require('../../errors'),
    path = require('path'),
    rp = require('../../'),
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

            expect(p instanceof Bluebird).to.eql(true);

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

});
