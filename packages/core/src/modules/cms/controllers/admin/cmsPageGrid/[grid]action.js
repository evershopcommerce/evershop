const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  await stack.grid;

  const pages = get(response.context, 'grid.pages', []);
  pages.forEach((el, index) => {
    this[index].editUrl = buildUrl('cmsPageEdit', { id: parseInt(this[index].cms_page_id, 10) });
  }, pages);

  assign(response.context, { deleteCmsPagesUrl: buildUrl('cmsPageBulkDelete') });
};
