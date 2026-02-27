const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  rootDir: '.',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.m?[jt]sx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@angular|zone\\.js)/)'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/public-api.ts',
    '!src/**/index.ts',
    '!src/test-setup.ts',
  ],
  coverageDirectory: 'coverage',
};
