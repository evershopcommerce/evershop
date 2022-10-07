const { getConfig } = require('../../../../../lib/util/getConfig');

module.exports = {
  Price: {
    value: (rawPrice, { currency }) => {
      return parseFloat(rawPrice);// TODO: Format for decimal value?
    },
    currency: (_, { currency }) => {
      return currency || getConfig('shop.currency', 'USD');
    },
    text: (rawPrice, { currency }) => {
      const price = parseFloat(rawPrice);// TODO: Format for decimal value?
      const curr = currency || getConfig('shop.currency', 'USD');
      const language = getConfig('shop.language', 'en');
      return new Intl.NumberFormat(language, { style: 'currency', currency: curr }).format(price);
    }
  }
}