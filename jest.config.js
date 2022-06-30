const config = {
  verbose: true,
  setupFilesAfterEnv: [require.resolve('regenerator-runtime/runtime')],
  testMatch: ['/**/packages/core/src/**/tests/unit/*.[jt]s?(x)'],
  coveragePathIgnorePatterns: [
    '<rootDir>/.nodejscart/',
    '<rootDir>/node_modules/',
    '<rootDir>/packages/core/dist/',
    '<rootDir>/packages/core/node_modules/'
  ]
}

module.exports = config;
