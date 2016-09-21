var gulp = require('gulp')
, serve = require('gulp-serve')
, uglify = require('gulp-uglify')
, browserify = require('browserify')
, babelify = require('babelify')
, source = require('vinyl-source-stream')
, buffer = require('vinyl-buffer');

gulp.task('serve', serve('./'));

// Concat everything and then transform into es5

function build() {
    return browserify({
        entries: ['./alm.js'],
        basedir: __dirname + '/lib/'
    })
        .transform(babelify, {
            plugins: [
                [require('babel-plugin-transform-es2015-arrow-functions')],
                [require('babel-plugin-transform-es2015-block-scoped-functions')],
                [require('babel-plugin-transform-es2015-block-scoping')],
                [require('babel-plugin-add-module-exports')],
                [require('babel-plugin-transform-es2015-modules-commonjs'), {
                    allowTopLevelThis: true
                }]
            ]
        })
        .bundle()
        .pipe(source('alm.js'))
        .pipe(buffer())
        .pipe(uglify({
            mangle: false
        }))
        .pipe(gulp.dest('dist'));
}

gulp.task('make', function() {
    return build();
});
