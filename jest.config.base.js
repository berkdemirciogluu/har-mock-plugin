/** @type {import('jest').Config} */
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
    }],
  },
  moduleNameMapper: {
    '^@har-mock/core(.*)$': '<rootDir>/../core/src$1',
  },
  collectCoverage: true,
  coverageThreshold: {
    global: {
      // Story 1.1: Skeleton setup — gerçek iş mantığı yok, threshold 0
      // Story 1.2+ ile birlikte 80'e yükseltilecek
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = baseConfig;
