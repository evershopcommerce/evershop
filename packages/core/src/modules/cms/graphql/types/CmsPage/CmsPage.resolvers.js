const { select } = require("@evershop/mysql-query-builder");
const { buildUrl } = require("../../../../../lib/router/buildUrl");
const { camelCase } = require("../../../../../lib/util/camelCase");
const { getContextValue } = require("../../../../graphql/services/buildContext");

module.exports = {
  Query: {
    cmsPage: async (root, { id }, { pool }) => {
      const { admin } = getContextValue('tokenPayload', {});
      const query = select()
        .from('cms_page');
      query.leftJoin('cms_page_description')
        .on('cms_page.`cms_page_id`', '=', 'cms_page_description.`cms_page_description_cms_page_id`');
      query.where('cms_page_id', '=', id);
      if (admin !== true) {
        query.where('cms_page.`status`', '=', 1);
      }

      const page = await query.load(pool);
      return page ? camelCase(page) : null;
    },
    cmsPages: async (_, { filters = [] }, { pool }) => {
      const query = select().from('cms_page');
      query.leftJoin('cms_page_description')
        .on('cms_page.`cms_page_id`', '=', 'cms_page_description.`cms_page_description_cms_page_id`');
      const currentFilters = [];

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'name') {
          query.andWhere('cms_page_description.`name`', 'LIKE', `%${filter.value}%`);
          currentFilters.push({
            key: 'name',
            operation: '=',
            value: filter.value
          });
        }
        if (filter.key === 'status') {
          query.andWhere('cms_page.`status`', '=', filter.value);
          currentFilters.push({
            key: 'status',
            operation: '=',
            value: filter.value
          });
        }
      })

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find((f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'name') {
        query.orderBy('cms_page_description.`name`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('cms_page.`cms_page_id`', sortOrder.value);
      };

      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(cms_page.`cms_page_id`)', 'total');
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 };// TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit((page.value - 1) * parseInt(limit.value), parseInt(limit.value));
      return {
        items: (await query.execute(pool)).map(row => camelCase(row)),
        total: (await cloneQuery.load(pool))['total'],
        currentFilters: currentFilters,
      }
    }
  },
  CmsPage: {
    url: ({ urlKey }) => buildUrl('cmsPageView', { url_key: urlKey }),
    editUrl: ({ cmsPageId }) => buildUrl('cmsPageEdit', { id: cmsPageId })
  }
}