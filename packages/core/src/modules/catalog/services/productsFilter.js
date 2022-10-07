const { getFilterableAttributes } = require('./getFilterableAttributes');
const { getPriceRange } = require('./getPriceRange');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};
/**
 *  This function takes a list of product ID
 * and get all attribute, category and price can be used in filter table
 * @param {Array[Number]} productIds
 */
exports.productsFilters = async function productsFilters(productIds = []) {
  return {
    price: getPriceRange(productIds),
    attributes: getFilterableAttributes(productIds)
  };
};
