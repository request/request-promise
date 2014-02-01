var rp = require('../lib/rp.js');

describe('request tests', function () {

    it('should request google.com', function (done) {
        rp('http://www.google.com')
		    .then(done.bind(null, null))
		    .catch(done);
    });

    it('should catch errors', function (done) {
        rp('http://googl')
		    .then(done.bind(null, 'then callback was called'))
		    .catch(done.bind(null, null));
    });

});