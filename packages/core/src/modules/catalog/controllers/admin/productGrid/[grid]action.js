const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  await stack.grid;

  const products = get(response.context, 'grid.products', []);
  // eslint-disable-next-line func-names
  products.forEach(function (el, index) {
    this[index].editUrl = buildUrl('productEdit', { id: parseInt(this[index].product_id, 10) });// TODO: This should be a part of the name column
    this[index].deleteUrl = buildUrl('productEdit', { id: parseInt(this[index].product_id, 10) });
  }, products);

  assign(response.context, { deleteProductsUrl: buildUrl('productBulkDelete') });
  assign(response.context, { enableProductsUrl: buildUrl('productBulkEnable') });
  assign(response.context, { disableProductUrl: buildUrl('productBulkDisable') });
};
