'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var chalk = require('chalk');
var rimraf = require('rimraf');
var coveralls = require('gulp-coveralls');
var eslint = require('gulp-eslint');
var _ = require('lodash');

var chai = require('chai');
global.expect = chai.expect;


var paths = {
    libJsFiles: ['./lib/**/*.js', './errors.js'],
    specFiles: './test/spec/**/*.js',
    fixtureFiles: './test/fixtures/**/*.js',
    gulpfile: './gulpfile.js',
    eslintrc: './.eslintrc.json'
};


gulp.task('dev', ['watch', 'validate']);

gulp.task('watch', function () {

    gulp.watch(_.flatten([
        paths.libJsFiles,
        paths.specFiles,
        paths.fixtureFiles,
        paths.gulpfile
    ]), [
        'validate'
    ]);

    gulp.watch(_.flatten([
        paths.eslintrc
    ]), [
        'lint'
    ]);

});

gulp.task('validate', function (done) {
    runSequence('lint', 'test', done);
});

gulp.task('lint', function () {

    return gulp.src(_.flatten([
        paths.libJsFiles,
        paths.gulpfile,
        paths.specFiles,
        paths.fixtureFiles,
        paths.gulpfile
    ]))
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());

});

gulp.task('test', ['clean'], function (done) {

    var coverageVariable = '$$cov_' + new Date().getTime() + '$$';

    gulp.src(paths.libJsFiles)
        .pipe(istanbul({
            coverageVariable: coverageVariable
        }))
        .pipe(istanbul.hookRequire())
        .on('finish', function () {

            gulp.src(paths.specFiles)
                .pipe(mocha())
                .on('error', function (err) {
                    console.error(String(err));
                    console.error(chalk.bold.bgRed(' TESTS FAILED '));
                    done(new Error(' TESTS FAILED '));
                })
                .pipe(istanbul.writeReports({
                    reporters: ['lcov'],
                    coverageVariable: coverageVariable
                }))
                .on('end', done);

        });

});

gulp.task('test-without-coverage', function () {

    return gulp.src(paths.specFiles)
        .pipe(mocha())
        .on('error', function () {
            console.log(chalk.bold.bgRed(' TESTS FAILED '));
        });

});

gulp.task('clean', ['clean-coverage']);

gulp.task('clean-coverage', function (done) {
    rimraf('./coverage', done);
});

gulp.task('ci', function (done) {
    runSequence('validate', 'coveralls', 'test-without-coverage', done);
});

gulp.task('ci-no-cov', function (done) {
    runSequence('validate', 'test-without-coverage', done);
});

gulp.task('coveralls', function () {
    return gulp.src('coverage/**/lcov.info')
        .pipe(coveralls());
});
