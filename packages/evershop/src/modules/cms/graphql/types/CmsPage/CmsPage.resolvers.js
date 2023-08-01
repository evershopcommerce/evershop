const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getCmsPagesBaseQuery
} = require('../../../services/getCmsPagesBaseQuery');
const { CMSPageCollection } = require('../../../services/CMSPageCollection');

module.exports = {
  Query: {
    cmsPage: async (root, { id }, { pool }) => {
      const query = select().from('cms_page');
      query
        .leftJoin('cms_page_description')
        .on(
          'cms_page.cms_page_id',
          '=',
          'cms_page_description.cms_page_description_cms_page_id'
        );
      query.where('cms_page_id', '=', id);

      const page = await query.load(pool);
      return page ? camelCase(page) : null;
    },
    cmsPages: async (_, { filters = [] }, { user }) => {
      const query = getCmsPagesBaseQuery();
      const root = new CMSPageCollection(query);
      await root.init({}, { filters }, { user });
      return root;
    }
  },
  CmsPage: {
    url: ({ urlKey }) => buildUrl('cmsPageView', { url_key: urlKey }),
    editUrl: ({ uuid }) => buildUrl('cmsPageEdit', { id: uuid }),
    updateApi: (page) => buildUrl('updateCmsPage', { id: page.uuid }),
    deleteApi: (page) => buildUrl('deleteCmsPage', { id: page.uuid })
  }
};
