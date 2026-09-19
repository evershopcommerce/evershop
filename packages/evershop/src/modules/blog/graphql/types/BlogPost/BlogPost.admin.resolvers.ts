import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  BlogPost: {
    editUrl: ({ uuid }: any) => buildUrl('blogPostEdit', { id: uuid }),
    updateApi: ({ uuid }: any) => buildUrl('updateBlogPost', { id: uuid }),
    deleteApi: ({ uuid }: any) => buildUrl('deleteBlogPost', { id: uuid })
  }
};
