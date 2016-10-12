var gulp = require('gulp');
var serve = require('gulp-serve');
var ts = require('gulp-typescript');
var gulpWebpack = require('gulp-webpack');
var webpack = require('webpack');
var del = require('del');

gulp.task('js', function() {
    return gulp.src('./src/*.ts')
        .pipe(ts({
            noImplicitAny: false,
            module: 'amd'
        }))
        .pipe(gulp.dest('./dist/lib'));
});

gulp.task('task', ['js'], function() {
    return gulp.src('./dist/lib/task.js')
        .pipe(gulpWebpack({
            output: {
                filename: 'task-umd.js',
                libraryTarget: 'umd',
                /* leave off this part and it'll be namespaced in code with
                   `require` and not in browsers. */
                library: 'task'
            },
            plugins: [
                new webpack.optimize.UglifyJsPlugin()
            ]
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('bundle', ['js'], function() {
    return gulp.src('./dist/lib/alm.js')
        .pipe(gulpWebpack({
            output: {
                filename: 'alm-bundled.js',
                libraryTarget: 'var',
                library: 'alm'
            },
            plugins: [
                new webpack.optimize.UglifyJsPlugin()
            ]
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('example', ['js'], function() {
    return gulp.src('./docs/js/src/todo.js')
        .pipe(gulpWebpack({
            output: {
                filename: 'todo.js'
            }
        }))
        .pipe(gulp.dest('./docs/js/dist/'));
});

gulp.task('docs', ['example'], function() {
    return gulp.src('./docs/js/src/main.js')
        .pipe(gulpWebpack({
            output: {
                filename: 'main.js'
            }
        }))
        .pipe(gulp.dest('./docs/js/dist/'));
});

gulp.task('serve', serve('./docs/'));

gulp.task('clean', function() {
    del(['./src/*.js',
         './dist/lib',
         './dist/task-umd.js']);
});
