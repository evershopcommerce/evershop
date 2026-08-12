import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { BlogCommentCollection } from '../../../services/BlogCommentCollection.js';
import { getBlogCommentsBaseQuery } from '../../../services/getBlogCommentsBaseQuery.js';

export default {
  Query: {
    blogComments: async (_root: any, { filters = [] }: any) => {
      const query = getBlogCommentsBaseQuery();
      const root = new BlogCommentCollection(query);
      await root.init(filters);
      return root;
    }
  },
  BlogComment: {
    moderateApi: ({ uuid }: any) =>
      buildUrl('moderateBlogComment', { id: uuid }),
    deleteApi: ({ uuid }: any) => buildUrl('deleteBlogComment', { id: uuid })
  }
};
