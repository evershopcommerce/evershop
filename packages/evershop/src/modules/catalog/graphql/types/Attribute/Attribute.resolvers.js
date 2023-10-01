/* eslint-disable no-param-reassign */
const { select } = require('@evershop/postgres-query-builder');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');

module.exports = {
  Query: {
    attribute: async (_, { id }, { pool }) => {
      const attribute = await select()
        .from('attribute')
        .where('attribute_id', '=', id)
        .load(pool);
      if (!attribute) {
        return null;
      } else {
        return camelCase(attribute);
      }
    }
  },
  Attribute: {
    options: async (attribute, _, { pool }) => {
      const results = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute.attributeId)
        .execute(pool);
      return results.map((result) => camelCase(result));
    }
  }
};
