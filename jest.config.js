const config = {
  verbose: true,
  setupFilesAfterEnv: [require.resolve('regenerator-runtime/runtime')],
  testMatch: ['/**/tests/unit/**/*.[jt]s?(x)'],
  coveragePathIgnorePatterns: [
    '<rootDir>/.nodejscart/',
    '<rootDir>/node_modules/',
    '<rootDir>/packages/core/dist/',
    '<rootDir>/packages/core/node_modules/'
  ]
};

module.exports = config;
