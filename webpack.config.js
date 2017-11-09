var path = require('path');
var webpack = require('webpack');

var config = {
    entry: {
        'alm': './src/alm.ts',
        'alm.min': './src/alm.ts'
    },

    output: {
        path: path.resolve(__dirname, '_bundles'),
        filename: '[name].js',
        libraryTarget: 'umd',
        library: 'alm',
        umdNamedDefine: true
    },

    resolve: {
        extensions: ['.ts', '.js' ]
    },

    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            minimize: true,
            include: /\.min\.js$/
        })
    ],

    module: {
        loaders: [{
            test: /\.tsx?$/,
            loader: 'awesome-typescript-loader',
            exclude: /node_modules/
        }]
    }
};

module.exports = config;
