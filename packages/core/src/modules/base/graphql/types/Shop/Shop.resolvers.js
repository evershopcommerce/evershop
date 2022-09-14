const { buildUrl } = require("../../../../../lib/router/buildUrl")
const { getConfig } = require("../../../../../lib/util/getConfig")

module.exports = {
  Query: {
    shop: (root, args, context) => {
      return {
        homeUrl: buildUrl('homepage'),
        name: getConfig("shop.title", "EverShop"),
        description: getConfig("shop.description", "EverShop"),
        currency: getConfig("shop.currency", "USD"),
        language: getConfig("shop.language", "en"),
        timezone: getConfig("shop.timezone", "America/New_York"),
      }
    }
  }
}