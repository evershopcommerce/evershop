import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  BlogCategory: {
    editUrl: ({ uuid }: any) => buildUrl('blogCategoryEdit', { id: uuid }),
    updateApi: ({ uuid }: any) => buildUrl('updateBlogCategory', { id: uuid }),
    deleteApi: ({ uuid }: any) => buildUrl('deleteBlogCategory', { id: uuid })
  }
};
