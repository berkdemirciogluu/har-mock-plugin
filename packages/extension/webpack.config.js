const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { AngularWebpackPlugin } = require('@ngtools/webpack');

module.exports = (env, argv) => {
  const mode = argv && argv.mode === 'development' ? 'development' : 'production';

  /** Angular Popup Config — Uses @ngtools/webpack + AngularWebpackPlugin for AOT */
  const popupConfig = {
    name: 'popup',
    mode,
    entry: {
      popup: './src/popup/main.ts',
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
        tsconfig: path.resolve(__dirname, 'tsconfig.popup.json'),
        jitMode: false,
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup/index.html',
        chunks: ['popup'],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
    devtool: mode === 'development' ? 'inline-source-map' : false,
  };

  /** Service Worker & Content Script Config — Uses ts-loader (no Angular AOT) */
  const swConfig = {
    name: 'sw',
    mode,
    entry: {
      background: './src/background/background.ts',
      content: './src/content/content.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist/extension'),
      filename: '[name].js',
      clean: false,
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
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, 'tsconfig.sw.json'),
                transpileOnly: true,
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [{ from: 'public', to: '.' }],
      }),
    ],
    devtool: mode === 'development' ? 'inline-source-map' : false,
  };

  return [popupConfig, swConfig];
};
