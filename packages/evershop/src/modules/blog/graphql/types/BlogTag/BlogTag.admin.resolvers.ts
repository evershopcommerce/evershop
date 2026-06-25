import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  BlogTag: {
    editUrl: ({ uuid }: any) => buildUrl('blogTagEdit', { id: uuid }),
    updateApi: ({ uuid }: any) => buildUrl('updateBlogTag', { id: uuid }),
    deleteApi: ({ uuid }: any) => buildUrl('deleteBlogTag', { id: uuid })
  }
};
