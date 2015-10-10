'use strict';

var rp = require('../../../lib/rp.js');
var cls = require('continuation-local-storage');


var ns = cls.createNamespace('testNS');
rp.bindCLS(ns);


function print() {
    ns.run(function () {

        ns.set('value', ns.get('value') + 1);

        console.log(ns.get('value'));

    });
}

ns.run(function () {

    ns.set('value', 0);

    rp('http://localhost:4000/200')
        .then(function () {
            ns.run(function () {
                ns.set('value', ns.get('value') + 1);

                setTimeout(print);
            });
        });

});
