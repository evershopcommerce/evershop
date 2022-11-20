const { buildUrl } = require("../../../../../lib/router/buildUrl");
const { getSetting } = require("../../../../setting/services/setting");

module.exports = {
  Shop: {
    homeUrl: (root, { }, context) => {
      return buildUrl('homepage');
    },
    name: (root, { }, context) => {
      getSetting('storeName')
    },
    description: (root, { }, context) => {
      getSetting('storeDescription')
    },
    phone: (root, { }, context) => {
      getSetting('storePhoneNumber')
    },
    email: (root, { }, context) => {
      getSetting('storePhoneEmail')
    },
    language: (root, { }, context) => {
      'en' // TODO: To be configured
    },
    currency: (root, { }, context) => {
      getSetting('storeCurrency')
    },
    timezone: (root, { }, context) => {
      getSetting('storeTimeZone')
    },
    weightUnit: (root, { }, context) => {
      getSetting('weightUnit')
    }
  }
}