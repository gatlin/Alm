var gulp = require('gulp')
  , serve = require('gulp-serve')
  , concat = require('gulp-concat');

gulp.task('serve', serve('./'));

gulp.task('scripts', function() {
    return gulp.src(['./lib/loeb.js', './lib/alm.js'])
        .pipe(concat('alm.js'))
        .pipe(gulp.dest('./'));
});

