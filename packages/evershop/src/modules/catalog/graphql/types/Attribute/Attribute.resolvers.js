/* eslint-disable no-param-reassign */
const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
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
    },
    attributes: async (_, { filters: requestedFilters = [] }, { pool }) => {
      const query = select().from('attribute');

      const currentFilters = [];

      const filters = requestedFilters.map((filter) => {
        if (filter.operation.toUpperCase() === 'LIKE') {
          filter.valueRaw = filter.value.replace(/^%/, '').replace(/%$/, '');
        } else {
          filter.valueRaw = filter.value;
        }
        if (filter.operation.toUpperCase() === 'IN') {
          filter.value = filter.value.split(',');
        }
        return filter;
      });

      // Name filter
      const nameFilter = filters.find((f) => f.key === 'name');
      if (nameFilter) {
        query.andWhere(
          'attribute.attribute_name',
          'LIKE',
          `%${nameFilter.value}%`
        );
        currentFilters.push({
          key: 'name',
          operation: '=',
          value: nameFilter.value
        });
      }

      // Code filter
      const codeFilter = filters.find((f) => f.key === 'code');
      if (codeFilter) {
        query.andWhere(
          'attribute.attribute_code',
          codeFilter.operation,
          codeFilter.value
        );
        currentFilters.push({
          key: 'code',
          operation: codeFilter.operation,
          value: codeFilter.valueRaw
        });
      }

      // Attribute group filter
      const groupFilter = filters.find((f) => f.key === 'group');
      if (groupFilter) {
        const attributes = await select()
          .from('attribute_group_link')
          .where('group_id', groupFilter.operation, groupFilter.value)
          .execute(pool);

        query.andWhere(
          'attribute.attribute_id',
          'IN',
          attributes.map((a) => a.attribute_id)
        );
        currentFilters.push({
          key: 'group',
          operation: groupFilter.operation,
          value: groupFilter.valueRaw
        });
      }

      // Type filter
      const typeFilter = filters.find((f) => f.key === 'type');
      if (typeFilter) {
        query.andWhere(
          'attribute.type',
          typeFilter.operation,
          typeFilter.value
        );
        currentFilters.push({
          key: 'type',
          operation: typeFilter.operation,
          value: typeFilter.valueRaw
        });
      }

      // isRequired filter
      const isRequiredFilter = filters.find((f) => f.key === 'isRequired');
      if (isRequiredFilter) {
        query.andWhere(
          'attribute.is_required',
          isRequiredFilter.operation,
          isRequiredFilter.value
        );
        currentFilters.push({
          key: 'isRequired',
          operation: isRequiredFilter.operation,
          value: isRequiredFilter.valueRaw
        });
      }

      // isFilterable filter
      const isFilterableFilter = filters.find((f) => f.key === 'isFilterable');
      if (isFilterableFilter) {
        query.andWhere(
          'attribute.is_filterable',
          isFilterableFilter.operation,
          isFilterableFilter.value
        );
        currentFilters.push({
          key: 'isFilterable',
          operation: isFilterableFilter.operation,
          value: isFilterableFilter.valueRaw
        });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'name') {
        query.orderBy('attribute.attribute_name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('attribute.attribute_id', 'DESC');
      }
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(*)', 'total');
      cloneQuery.removeOrderBy();
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit(
        (page.value - 1) * parseInt(limit.value, 10),
        parseInt(limit.value, 10)
      );
      return {
        items: (await query.execute(pool)).map((row) => camelCase(row)),
        total: (await cloneQuery.load(pool)).total,
        currentFilters
      };
    },
    attributeGroups: async (
      _,
      { filters: requestedFilters = [] },
      { pool }
    ) => {
      const query = select().from('attribute_group');

      const currentFilters = [];

      const filters = requestedFilters.map((filter) => {
        if (filter.operation.toUpperCase() === 'LIKE') {
          filter.valueRaw = filter.value.replace(/^%/, '').replace(/%$/, '');
        } else {
          filter.valueRaw = filter.value;
        }
        if (filter.operation.toUpperCase() === 'IN') {
          filter.value = filter.value.split(',');
        }
        return filter;
      });

      // Name filter
      const nameFilter = filters.find((f) => f.key === 'name');
      if (nameFilter) {
        query.andWhere(
          'attribute_group.group_name',
          'LIKE',
          `%${nameFilter.value}%`
        );
        currentFilters.push({
          key: 'name',
          operation: '=',
          value: nameFilter.value
        });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find(
        (f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)
      ) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'name') {
        query.orderBy('attribute_group.group_name', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('attribute_group.attribute_group_id', 'DESC');
      }
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(*)', 'total');
      cloneQuery.removeOrderBy();
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 }; // TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit(
        (page.value - 1) * parseInt(limit.value, 10),
        parseInt(limit.value, 10)
      );
      return {
        items: (await query.execute(pool)).map((row) => camelCase(row)),
        total: (await cloneQuery.load(pool)).total,
        currentFilters
      };
    }
  },
  AttributeGroup: {
    attributes: async (group, _, { pool }) => {
      const rows = await select()
        .from('attribute')
        .where(
          'attribute_id',
          'IN',
          (
            await select('attribute_id')
              .from('attribute_group_link')
              .where('group_id', '=', group.attributeGroupId)
              .execute(pool)
          ).map((a) => a.attribute_id)
        )
        .execute(pool);
      return rows.map((row) => camelCase(row));
    },
    updateApi: (group) => buildUrl('updateAttributeGroup', { id: group.uuid })
  },

  Attribute: {
    groups: async (attribute, _, { pool }) => {
      const results = await select()
        .from('attribute_group')
        .where(
          'attribute_group_id',
          'IN',
          (
            await select('group_id')
              .from('attribute_group_link')
              .where('attribute_id', '=', attribute.attributeId)
              .execute(pool)
          ).map((g) => g.group_id)
        )
        .execute(pool);
      return results.map((result) => camelCase(result));
    },
    options: async (attribute, _, { pool }) => {
      const results = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute.attributeId)
        .execute(pool);
      return results.map((result) => camelCase(result));
    },
    editUrl: ({ uuid }) => buildUrl('attributeEdit', { id: uuid }),
    updateApi: (attribute) =>
      buildUrl('updateAttribute', { id: attribute.uuid }),
    deleteApi: (attribute) =>
      buildUrl('deleteAttribute', { id: attribute.uuid })
  }
};
