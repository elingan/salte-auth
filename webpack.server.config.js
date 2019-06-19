const common = require('./webpack.common.config.js');

const config = common({
  es6: false,
  minified: false
});

config.module.rules.push({
  test: /\.html$/,
  exclude: /node_modules/,
  loader: 'html-loader'
});
config.externals = [];
config.entry['salte-auth'] = ['../index.html', '../index.js'];
config.devtool = 'inline-source-map';
config.devServer = {
  host: 'localhost',
  port: '9000',
  historyApiFallback: true,
  disableHostCheck: true
};

module.exports = config;
