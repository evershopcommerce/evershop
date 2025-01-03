const packageJson = require('@evershop/evershop/package.json');

module.exports = {
  Query: {
    version: () => packageJson.version
  }
};
