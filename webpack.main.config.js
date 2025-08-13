const path = require('path');

module.exports = [
  {
    entry: './src/main/main.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist/main'),
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
  {
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/main'),
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
];