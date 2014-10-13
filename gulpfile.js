'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');
var jshint = require('gulp-jshint');
var jshintStylish = require('jshint-stylish');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var chalk = require('chalk');
var rimraf = require('rimraf');


var paths = {
    libJsFiles: './lib/**/*.js',
    gulpfile: './gulpfile.js',
    specFiles: './test/**/*.js'
};


gulp.task('dev', ['watch', 'validate']);

gulp.task('watch', function () {

    return gulp.watch([
        paths.libJsFiles,
        paths.gulpfile,
        paths.specFiles
    ], [
        'validate'
    ]);

});

gulp.task('validate', function (done) {
    runSequence('lint', 'test', done);
});

gulp.task('lint', function () {

    return gulp.src([paths.libJsFiles, paths.gulpfile, paths.specFiles])
        .pipe(jshint())
        .pipe(jshint.reporter(jshintStylish))
        .pipe(jshint.reporter('fail'));

});

gulp.task('test', ['clean'], function (done) {

    var coverageVariable = '$$cov_' + new Date().getTime() + '$$';

    gulp.src(paths.libJsFiles)
        .pipe(istanbul({
            coverageVariable: coverageVariable
        }))
        .on('finish', function () {

            gulp.src(paths.specFiles)
                .pipe(mocha())
                .on('error', function () {
                    console.log(chalk.bold.bgRed(' TESTS FAILED '));
                    done();
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

gulp.task('clean', function (done) {
    rimraf('./coverage', done);
});
