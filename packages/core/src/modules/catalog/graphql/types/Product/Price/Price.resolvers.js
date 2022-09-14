const { getConfig } = require('../../../../../../lib/util/getConfig');

module.exports = {
  Product: {
    price: (product, _, { pool }) => {
      const price = parseFloat(product.price);
      const currency = getConfig('shop.currency', 'USD');
      const language = getConfig('shop.language', 'en');
      const formatedPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(price);
      return {
        regular: {
          value: price,
          currency: getConfig('shop.currency', 'USD'),
          text: formatedPrice
        },
        special: {
          value: price,
          currency: getConfig('shop.currency', 'USD'),
          text: formatedPrice
        } // TODO: implement special price
      };
    }
  }
}