const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  await stack.grid;

  const categories = get(response.context, 'grid.categories', []);
  categories.forEach(function (el, index) {
    this[index].editUrl = buildUrl('categoryEdit', { id: parseInt(this[index].category_id, 10) });
    this[index].deleteUrl = buildUrl('categoryEdit', { id: parseInt(this[index].category_id, 10) });
  }, categories);

  assign(response.context, { deleteCategoriesUrl: buildUrl('categoryBulkDelete') });
};
