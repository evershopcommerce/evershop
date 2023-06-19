module.exports = {
  Product: {
    inventory: async (product) => ({
      ...product,
      qty: parseInt(product.qty, 10),
      isInStock:
        (parseInt(product.qty, 10) > 0 && product.stockAvailability === true) ||
        product.manageStock === false
    })
  }
};
