/** @type {import('jest').Config} */
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@har-mock/core(.*)$': '<rootDir>/../core/src$1',
  },
  collectCoverage: true,
  coverageThreshold: {
    global: {
      // Story 1.2: Coverage threshold 80%'e yükseltildi
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = baseConfig;
