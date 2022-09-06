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
    attributeGroups: (_, _, { pool }) => {
      const query = select().from('attribute_group');
      return query
        .execute(pool)
        .then((results) => results.map((result) => camelCase(result)));
    }
  },
  AttributeGroup: {
    attributes: (group, _, { pool }) => {
      return select()
        .from('attribute')
        .where(
          'attribute_id',
          'IN',
          await select('attribute_id')
            .from('attribute_group_link')
            .where('group_id', group.attributeGroupId)
            .execute(pool)
        )
        .execute(pool)
        .then((results) => results.map((result) => camelCase(result)));
    }
  },

  Attribute: {
    groups: (attribute, _, { pool }) => {
      return select()
        .from('attribute_group')
        .where(
          'attribute_id',
          'IN',
          await select('group_id')
            .from('attribute_group_link')
            .where('attribute_id', attribute.attributeId)
            .execute(pool)
        )
        .execute(pool)
        .then((results) => results.map((result) => camelCase(result)));
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