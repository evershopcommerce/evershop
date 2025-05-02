import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Price: {
    value: (rawPrice) => parseFloat(rawPrice), // TODO: Format for decimal value?
    currency: async (_, { currency }) => {
      const curr = currency || getConfig('shop.currency', 'USD');
      return curr;
    },
    text: async (rawPrice, { currency }) => {
      const price = parseFloat(rawPrice); // TODO: Format for decimal value?
      const curr = currency || getConfig('shop.currency', 'USD');
      const language = getConfig('shop.language', 'en');
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency: curr
      }).format(price);
    }
  }
};
