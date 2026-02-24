const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { AngularWebpackPlugin } = require('@ngtools/webpack');

module.exports = (env, argv) => {
  const mode = argv && argv.mode === 'development' ? 'development' : 'production';

  return {
    mode,
    entry: {
      popup: './src/popup/main.ts',
      background: './src/background/background.ts',
      content: './src/content/content.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist/extension'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@har-mock/core': path.resolve(__dirname, '../core/src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.[cm]?tsx?$/,
          use: [
            {
              loader: '@ngtools/webpack',
            },
          ],
        },
        {
          test: /\.[cm]?js$/,
          resolve: { fullySpecified: false },
          use: {
            loader: 'babel-loader',
            options: {
              plugins: ['@angular/compiler-cli/linker/babel'],
              compact: false,
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
        },
      ],
    },
    plugins: [
      new AngularWebpackPlugin({
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        jitMode: false,
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup/index.html',
        chunks: ['popup'],
      }),
      new CopyWebpackPlugin({
        patterns: [{ from: 'public', to: '.' }],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
    devtool: mode === 'development' ? 'inline-source-map' : false,
  };
};
