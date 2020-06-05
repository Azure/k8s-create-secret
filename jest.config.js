module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true,
  coverageThreshold: {
    "global": {
      "branches": 30,
      "functions": 30,
      "lines": 30,
      "statements": 30
    }
  }
}
