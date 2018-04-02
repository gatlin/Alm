var path = require('path');
var webpack = require('webpack');

var config = {
    entry: {
        'main': './src/main.tsx',
        'main.min': './src/main.tsx'
    },

    output: {
        path: path.resolve(__dirname, 'js'),
        filename: '[name].js'
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js' ]
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
