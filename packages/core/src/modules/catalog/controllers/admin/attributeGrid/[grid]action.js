const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  await stack.grid;

  const attributes = get(response.context, 'grid.attributes', []);
  attributes.forEach((el, index) => {
    this[index].editUrl = buildUrl('attributeEdit', { id: parseInt(this[index].attribute_id, 10) });
    this[index].deleteUrl = buildUrl('attributeEdit', { id: parseInt(this[index].attribute_id, 10) });
  }, attributes);

  assign(response.context, { deleteAttributesUrl: buildUrl('attributeBulkDelete') });
};
