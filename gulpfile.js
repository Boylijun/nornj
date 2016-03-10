﻿var gulp = require('gulp'),
  browserify = require('browserify'),
  uglify = require('gulp-uglify'),
  source = require('vinyl-source-stream'),
  buffer = require('vinyl-buffer'),
  jasmine = require('gulp-jasmine'),
  rename = require('gulp-rename'),
  gulpif = require('gulp-if'),
  eslint = require('gulp-eslint'),
  argv = require('yargs').argv;

//Build js
gulp.task('build', function () {
  var libName = 'nornj.js';
  if (argv.min) {
    libName = 'nornj.min.js';
  }

  return browserify({
    entries: './src/base.js',
    standalone: 'NornJ'
  })
    .bundle()
    .pipe(source(libName))
    .pipe(buffer())
    .pipe(gulpif(argv.min, uglify()))
    .pipe(gulp.dest('./dist'));
});

//Unit testing
gulp.task("test", function () {
  return gulp.src(["./test/**/**Spec.js"])
    .pipe(jasmine());
});

//Run eslint
gulp.task('lint', function () {
  return gulp.src(['./src/**/*.js'])
    .pipe(eslint({
      "rules":{
        "camelcase": [2, {"properties": "always"}],
        "comma-dangle": [2, "never"],
        "semi": [2, "always"],
        "quotes": [2, "single"],
        "strict": [2, "global"]
      }
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

//Default task
gulp.task('default', ['build']);