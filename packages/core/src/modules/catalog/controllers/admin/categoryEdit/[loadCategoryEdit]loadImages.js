const { assign } = require('../../../../../lib/util/assign');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack) => {
  await stack.loadCategoryEdit;
  const image = get(response.context, 'category.image');
  if (image) { assign(response.context, { category: { image: { url: buildUrl('adminStaticAsset', [image]), path: image } } }); }
};
