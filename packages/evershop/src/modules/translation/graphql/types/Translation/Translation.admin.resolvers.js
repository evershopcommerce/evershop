const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getTranslationsBaseQuery
} = require('../../../services/translation/getTranslationsBaseQuery');

module.exports = {
  Query: {
    translation: async (root, { id }, { pool }) => {
      const query = getTranslationsBaseQuery();
      query.where('id', '=', id);

      const translation = await query.load(pool);
      return translation ? camelCase(translation) : null;
    },
    translations: async (_, __, { pool }) => {
      const query = getTranslationsBaseQuery();

      const translation = await query.execute(pool);
      const camelCaseTranslation = translation.map((item) => camelCase(item));
      return camelCaseTranslation;
    }
  }
};
