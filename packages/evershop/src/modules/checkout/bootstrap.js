const { error } = require('../../lib/log/logger');
const { addProcessor, addFinalProcessor } = require('../../lib/util/registry');
const { sortFields } = require('./services/cart/sortFields');
const {
  registerCartBaseFields
} = require('./services/cart/registerCartBaseFields');

const {
  registerCartItemBaseFields
} = require('./services/cart/registerCartItemBaseFields');
const {
  getProductsBaseQuery
} = require('../catalog/services/getProductsBaseQuery');
const { pool } = require('../../lib/postgres/connection');
const { merge } = require('../../lib/util/merge');

module.exports = () => {
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

  addProcessor('configuratonSchema', (schema) => {
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
