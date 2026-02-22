const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
    ...baseConfig,
    rootDir: '.',
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    // core inherits moduleNameMapper from base config
    // @har-mock/core self-reference resolves via base mapper
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/index.ts'],
    coverageDirectory: 'coverage'
};
