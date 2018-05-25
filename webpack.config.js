const path = require('path');
const webpack = require("webpack");
const PATHS = {
    app: path.join(__dirname, 'src'),
    build: path.join(__dirname, 'dist')
};

var options = {
    entry: {
        'queue-ts': [path.join(__dirname, 'index.ts')]
    },
    watch: false,
    output: {
        path: PATHS.build,
        filename: '[name].min.js',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    externals: [],
    plugins: [],
    module: {
        rules: [{
            test: /\.ts$/,
            loader: 'ts-loader'
        }]
    }
};

module.exports = options;