const { getSetting } = require('../../../../setting/services/setting');

module.exports = {
  Price: {
    value: (rawPrice, { currency }) => {
      return parseFloat(rawPrice);// TODO: Format for decimal value?
    },
    currency: async (_, { currency }) => {
      return currency || await getSetting('storeCurrency', 'USD');
    },
    text: async (rawPrice, { currency }) => {
      const price = parseFloat(rawPrice);// TODO: Format for decimal value?
      const curr = currency || await getSetting('storeCurrency', 'USD');
      const language = await getSetting('storeLanguage', 'en');
      return new Intl.NumberFormat(language, { style: 'currency', currency: curr }).format(price);
    }
  }
}