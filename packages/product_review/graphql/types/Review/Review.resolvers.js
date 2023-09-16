const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { select } = require('@evershop/postgres-query-builder');
const { ReviewCollection } = require('../../../services/ReviewCollection');
const {
  getReviewsBaseQuery
} = require('../../../services/getReviewsBaseQuery');

module.exports = {
  Product: {
    reviews: async ({ productId, variantGroupId }, _, { pool }) => {
      const products = [productId];
      if (variantGroupId) {
        const variantProducts = await select()
          .from('product')
          .where('variant_group_id', '=', variantGroupId)
          .execute(pool);
        products.push(...variantProducts.map((product) => product.product_id));
      }
      const comments = await select()
        .from('product_review')
        .where('product_id', 'IN', products)
        .andWhere('approved', '=', true)
        .execute(pool);

      return comments.map((comment) => camelCase(comment));
    }
  },
  Query: {
    reviews: async (_, { filters }, { user }) => {
      const query = getReviewsBaseQuery();
      const root = new ReviewCollection(query);
      await root.init({}, { filters }, { user });
      return root;
    }
  },
  Review: {
    approveApi: async ({ uuid }) => buildUrl('approveReview', { id: uuid }),
    deleteApi: async ({ uuid }) => buildUrl('deleteReview', { id: uuid }),
    unApproveApi: async ({ uuid }) => buildUrl('unApproveReview', { id: uuid }),
    product: async ({ productId }, _, { pool }) => {
      const productQuery = select().from('product');
      productQuery
        .leftJoin('product_description')
        .on(
          'product_description.product_description_product_id',
          '=',
          'product.product_id'
        );
      productQuery.where('product_id', '=', productId).load(pool);
      const product = await productQuery.load(pool);
      return camelCase(product);
    }
  }
};
