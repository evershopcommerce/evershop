const {
  toPrice
} = require('@evershop/evershop/src/modules/checkout/services/toPrice');

module.exports = {
  Product: {
    price: async (product) => {
      const price = toPrice(product.price);
      return {
        regular: price,
        special: price // TODO: implement special price
      };
    }
  }
};
