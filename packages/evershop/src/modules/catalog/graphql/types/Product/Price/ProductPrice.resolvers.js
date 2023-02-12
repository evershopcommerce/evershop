module.exports = {
  Product: {
    price: (product) => {
      const price = parseFloat(product.price);
      return {
        regular: price,
        special: price // TODO: implement special price
      };
    }
  }
};
