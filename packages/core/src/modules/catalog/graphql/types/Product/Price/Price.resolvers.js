const { getConfig } = require('../../../../../../lib/util/getConfig');

module.exports = {
  Product: {
    price: (product, _, { pool }) => {
      const price = parseFloat(product.price);
      return {
        regular: price,
        special: price // TODO: implement special price
      };
    }
  },
  Price: {
    value: (rawPrice) => {
      return parseFloat(rawPrice);// TODO: Format for decimal value?
    },
    currency: () => {
      return getConfig('shop.currency', 'USD');
    },
    text: (rawPrice) => {
      const price = parseFloat(rawPrice);// TODO: Format for decimal value?
      const currency = getConfig('shop.currency', 'USD');
      const language = getConfig('shop.language', 'en');
      return new Intl.NumberFormat(language, { style: 'currency', currency }).format(price);
    }
  }
}