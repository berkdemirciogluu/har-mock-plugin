const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
    ...baseConfig,
    rootDir: '.',
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/public-api.ts', '!src/**/index.ts'],
    coverageDirectory: 'coverage'
};
