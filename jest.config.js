module.exports = {
  verbose: true,
  setupFilesAfterEnv: [require.resolve('regenerator-runtime/runtime')],
  testMatch: ['**/packages/evershop/src/**/tests/unit/*.[jt]s?(x)'],
  coveragePathIgnorePatterns: [
    '<rootDir>/.evershop/',
    '<rootDir>/node_modules/',
    '<rootDir>/packages/core/node_modules/'
  ],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './test-results', outputName: 'junit.xml' }]
  ],
  collectCoverage: true,
  coverageReporters: ['html', 'cobertura'],
  coverageDirectory: './test-results' // Set the coverage directory to 'test-results'
};
