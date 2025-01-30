module.exports = {
   clearMocks: true,
   moduleFileExtensions: ['js', 'ts'],
   testEnvironment: 'node',
   testMatch: ['**/*.test.ts'],
   transform: {
      '^.+\\.ts$': 'ts-jest'
   },
   transformIgnorePatterns: ['/node_modules/(?!@kubernetes/client-node/)'],
   moduleNameMapper: {
      '^@kubernetes/client-node$':
         '<rootDir>/node_modules/@kubernetes/client-node/dist/index.d.ts'
   },
   verbose: true
}
