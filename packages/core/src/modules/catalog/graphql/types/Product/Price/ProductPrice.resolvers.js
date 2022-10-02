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
  }
}