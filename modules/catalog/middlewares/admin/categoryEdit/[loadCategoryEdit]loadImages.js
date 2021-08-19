const { assign } = require("../../../../../lib/util/assign");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack) => {
  await stack['loadCategoryEdit'];
  let image = get(response.context, "category.image");
  if (image)
    assign(response.context, { category: { image: { url: buildAdminUrl("adminStaticAsset", [image]), path: image } } });
};