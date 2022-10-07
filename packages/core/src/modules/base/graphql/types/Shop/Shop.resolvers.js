const { getConfig } = require("../../../../../lib/util/getConfig")

module.exports = {
  Query: {
    shop: (root, { }, context) => {
      return getConfig('shop', {})
    }
  }
}