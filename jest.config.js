const config = {
  verbose: true,
  setupFilesAfterEnv: [require.resolve('regenerator-runtime/runtime')],
  testMatch: ['/**/tests/unit/**/*.[jt]s?(x)']
};

module.exports = config;
