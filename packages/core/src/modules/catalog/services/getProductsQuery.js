const { getProductsBaseQuery } = require("./getProductsBaseQuery");

module.exports.getProductsQuery = async function getProductsQuery(categoryId) {
  const productsQuery = getProductsBaseQuery(categoryId);


}