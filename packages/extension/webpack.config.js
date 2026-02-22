const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup/index.html',
        chunks: ['popup'],
      }),
    ],
    devtool: mode === 'development' ? 'inline-source-map' : false,
  };
};
