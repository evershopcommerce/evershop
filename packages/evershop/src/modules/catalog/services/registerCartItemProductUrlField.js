import { getProductUrl } from './product/productUrl.js';

export const registerCartItemProductUrlField = (fields) => {
  const newFields = fields.concat([
    {
      key: 'productUrl',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          if (!this.getData('product_id')) {
            return null;
          }
          // url_rewrite first, else the productView route
          return getProductUrl(product.uuid);
        }
      ],
      dependencies: ['product_id']
    }
  ]);
  return newFields;
};
