const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getLanguagesBaseQuery
} = require('../../../services/language/getLanguagesBaseQuery');

module.exports = {
  Query: {
    language: async (root, { code }, { pool }) => {
      const query = getLanguagesBaseQuery();
      query.where('code', '=', code).andWhere('is_disabled', '=', 0);

      const customer = await query.load(pool);
      return customer ? camelCase(customer) : null;
    },
    languages: async (_, __, { pool }) => {
      const query = getLanguagesBaseQuery();
      query.andWhere('is_disabled', '=', 0);
      query.orderBy('language.code', 'ASC');

      const languages = await query.execute(pool);
      const camelCasedLanguages = languages.map((row) => camelCase(row));
      return camelCasedLanguages;
    }
  }
};
