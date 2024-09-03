const { v4: uuidv4 } = require('uuid');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getCmsPagesBaseQuery
} = require('../../../services/getCmsPagesBaseQuery');
const { CMSPageCollection } = require('../../../services/CMSPageCollection');

module.exports = {
  Query: {
    cmsPage: async (root, { id }, { pool }) => {
      const query = getCmsPagesBaseQuery();
      query.where('cms_page_id', '=', id);
      const page = await query.load(pool);
      return page ? camelCase(page) : null;
    },
    cmsPages: async (_, { filters = [] }, { user }) => {
      const query = getCmsPagesBaseQuery();
      const root = new CMSPageCollection(query);
      await root.init(filters, !!user);
      return root;
    }
  },
  CmsPage: {
    url: ({ urlKey }) => buildUrl('cmsPageView', { url_key: urlKey }),
    editUrl: ({ uuid }) => buildUrl('cmsPageEdit', { id: uuid }),
    updateApi: (page) => buildUrl('updateCmsPage', { id: page.uuid }),
    deleteApi: (page) => buildUrl('deleteCmsPage', { id: page.uuid }),
    content: ({ content }) => {
      try {
        return JSON.parse(content);
      } catch (e) {
        // This is for backward compatibility. If the content is not a JSON string then it is a raw HTML block
        const rowId = `r__${uuidv4()}`;
        return [
          {
            size: 1,
            id: rowId,
            columns: [
              {
                id: 'c__c5d90067-c786-4324-8e24-8e30520ac3d7',
                size: 1,
                data: {
                  time: 1723347125344,
                  blocks: [
                    {
                      id: 'AU89ItzUa7',
                      type: 'raw',
                      data: {
                        html: content
                      }
                    }
                  ],
                  version: '2.30.2'
                }
              }
            ]
          }
        ];
      }
    }
  }
};
