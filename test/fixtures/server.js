'use strict';

var bodyParser = require('body-parser');
var http = require('http');
var url = require('url');


module.exports = function startServer(port, cb) {

    var server = http.createServer(function (req, res) {

        bodyParser.json()(req, res, function () {

            var path = url.parse(req.url).pathname;
            var status = Number(path.split('?')[0].split('/')[1]);

            switch (status) {
                case 301:
                    res.writeHead(301, { Location: '/200' });
                    res.end();
                    break;
                default:
                    res.writeHead(status, {'Content-Type': 'text/plain'});
                    var body = req.method === 'POST' ? ' - ' + JSON.stringify(req.body) : '';
                    res.end(req.method + ' ' + path + body);
            }

        });

    });

    server.listen(port, function () {

        cb(function stopServer(done) {
            // Wait for all requests to finish since they may produce unhandled errors for tests at the end that don't wait themselves.
            setTimeout(function () {
                server.close();
                done();
            }, 20);
        });

    });

};
