import path from 'path';
import webpack from 'webpack';
import precompiler from '../../precompiler';

//Precompile all nornj templates which use "nj.js" names to the end.
precompiler({
  source: __dirname + '/components/**/*.nj.js'
});

export default {
  entry: __dirname + '/index.js',
  output: {
    path: path.join(__dirname, 'assets'),
    filename: 'bundle.js',
    publicPath: '/assets/'
  },

  module: {
    loaders: [
      { test: /\.js$/, loaders: ['babel-loader'], exclude: /node_modules/ }
    ]
  },

  resolve: {
    extensions: ['', '.js', '.jsx'],
    modulesDirectories: ['node_modules']
  },

  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        screw_ie8: true,
        warnings: false
      }
    })
  ]
};