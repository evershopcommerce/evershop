const { select } = require('@evershop/mysql-query-builder');

module.exports = {
  Query: {
    attributes: (_, { type = [], isFilterable }, { pool }) => {
      const query = select().from('attribute');
      if (type.length) {
        query.where('type', 'IN', type);
      }
      if (isFilterable) {
        query.andWhere('is_filterable', 1);
      }

      return query
        .execute(pool)
        .then((results) => results.map((result) => camelCase(result)));
    },
    attributeGroups: (_, { }, { pool }) => {
      const query = select().from('attribute_group');
      return query
        .execute(pool)
        .then((results) => results.map((result) => camelCase(result)));
    }
  },
  AttributeGroup: {
    attributes: async (group, _, { pool }) => {
      const rows = select()
        .from('attribute')
        .where(
          'attribute_id',
          'IN',
          await select('attribute_id')
            .from('attribute_group_link')
            .where('group_id', '', group.attributeGroupId)
            .execute(pool)
        )
        .execute(pool);
      return rows.map((row) => camelCase(row));
    }
  },

  Attribute: {
    groups: async (attribute, _, { pool }) => {
      const results = select()
        .from('attribute_group')
        .where(
          'attribute_id',
          'IN',
          await select('group_id')
            .from('attribute_group_link')
            .where('attribute_id', '=', attribute.attributeId)
            .execute(pool)
        )
        .execute(pool)
      return results.map((result) => camelCase(result));
    },
    options: (attribute, _, { pool }) => {
      return select()
        .from('attribute_option')
        .where('attribute_id', attribute.attributeId)
        .execute(pool)
        .then((results) => results.map((result) => camelCase(result)));
    }
  }
}