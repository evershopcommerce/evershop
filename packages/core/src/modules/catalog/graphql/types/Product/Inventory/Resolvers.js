const { select } = require('@evershop/mysql-query-builder');

module.exports = {
  Product: {
    inventory: async (product, _, { pool }) => {
      return {
        qty: parseInt(product.qty, 10),
        isInStock: parseInt(product.qty, 10) > 0 && parseInt(product.stockAvailability) === 1,
        manageStock: parseInt(product.manageStock, 10) === 1,
      }
    }
    // TODO: if an extension want to add more fields to inventory, How to extend this resolver?
    // Use eventDispatcher?
  }
}