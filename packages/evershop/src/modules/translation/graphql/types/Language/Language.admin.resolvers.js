const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getLanguagesBaseQuery
} = require('../../../services/language/getLanguagesBaseQuery');

module.exports = {
  Query: {
    language: async (root, { code }, { pool }) => {
      const query = getLanguagesBaseQuery();
      query.where('code', '=', code);

      const customer = await query.load(pool);
      return customer ? camelCase(customer) : null;
    },
    languages: async (_, { filters = [] }, { pool }) => {
      const query = getLanguagesBaseQuery();
      const currentFilters = [];

      filters.forEach((filter) => {
        if (filter.key === 'isDisabled') {
          query.andWhere('language.is_disabled', '=', `${filter.value}`);
          currentFilters.push({
            key: 'isDisabled',
            operation: 'eq',
            value: filter.value
          });
        }
      });

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (filter) =>
          filter.key === 'sortOrder' && ['ASC', 'DESC'].includes(filter.value)
      ) || { value: 'ASC' };

      if (sortBy && sortBy.value === 'code') {
        query.orderBy('language.code', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: 'eq',
          value: sortBy.value
        });
      } else {
        query.orderBy('language.is_default', 'DESC');
      }

      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: 'eq',
          value: sortOrder.value
        });
      }

      const languages = await query.execute(pool).map((row) => camelCase(row));
      return { languages, filters: currentFilters };
    }
  }
};
