import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';
import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { select } from '@evershop/postgres-query-builder';

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
          const urlRewrite = await select()
            .from('url_rewrite')
            .where('entity_uuid', '=', product.uuid)
            .and('entity_type', '=', 'product')
            .load(pool);
          if (!urlRewrite) {
            return buildUrl('productView', {
              uuid: product.uuid
            });
          } else {
            return urlRewrite.request_path;
          }
        }
      ],
      dependencies: ['product_id']
    }
  ]);
  return newFields;
};
