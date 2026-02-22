const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
module.exports = {
    ...baseConfig,
    rootDir: '.',
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/index.ts', '!src/**/main.ts', '!src/**/background.ts', '!src/**/content.ts', '!src/**/app.component.ts'],
    coverageDirectory: 'coverage'
};
