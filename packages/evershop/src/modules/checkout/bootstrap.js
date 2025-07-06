import { error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { merge } from '../../lib/util/merge.js';
import { addFinalProcessor, addProcessor } from '../../lib/util/registry.js';
import { getProductsBaseQuery } from '../../modules/catalog/services/getProductsBaseQuery.js';
import { registerCartBaseFields } from '../../modules/checkout/services/cart/registerCartBaseFields.js';
import { registerCartItemBaseFields } from '../../modules/checkout/services/cart/registerCartItemBaseFields.js';
import { sortFields } from '../../modules/checkout/services/cart/sortFields.js';

export default () => {
  addProcessor('cartFields', registerCartBaseFields, 0);

  addProcessor('cartItemFields', registerCartItemBaseFields, 0);

  addFinalProcessor('cartFields', (fields) => {
    try {
      const sortedFields = sortFields(fields);
      return sortedFields;
    } catch (e) {
      error(e);
      throw e;
    }
  });

  addFinalProcessor('cartItemFields', (fields) => {
    try {
      const sortedFields = sortFields(fields);
      return sortedFields;
    } catch (e) {
      error(e);
      throw e;
    }
  });

  addProcessor('cartItemProductLoaderFunction', () => async (id) => {
    const productQuery = getProductsBaseQuery();
    const product = await productQuery.where('product_id', '=', id).load(pool);
    return product;
  });

  addProcessor('configurationSchema', (schema) => {
    merge(schema, {
      properties: {
        checkout: {
          type: 'object',
          properties: {
            showShippingNote: {
              type: 'boolean'
            }
          }
        }
      }
    });
    return schema;
  });
};
