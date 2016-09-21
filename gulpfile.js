var gulp = require('gulp')
  , serve = require('gulp-serve')
  , concat = require('gulp-concat');

gulp.task('serve', serve('./'));

gulp.task('make', function() {
    return gulp.src(['./lib/loeb.js', './lib/alm.js'])
        .pipe(concat('alm.js'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('make-extra', function() {
    return gulp.src(['./lib/loeb.js', './lib/loeb_extra.js',
                     './lib/alm.js'])
               .pipe(concat('alm-extra.js'))
               .pipe(gulp.dest('./dist'));
});
