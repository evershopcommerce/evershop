/* eslint-disable no-param-reassign */
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  getAttributesBaseQuery
} = require('../../../services/getAttributesBaseQuery');
const {
  getAttributeGroupsBaseQuery
} = require('../../../services/getAttributeGroupsBaseQuery');
const {
  AttributeCollection
} = require('../../../services/AttributeCollection');
const {
  AttributeGroupCollection
} = require('../../../services/AttributeGroupCollection');

module.exports = {
  Query: {
    attributes: async (_, { filters = [] }) => {
      const query = getAttributesBaseQuery();
      const root = new AttributeCollection(query);
      await root.init(filters);
      return root;
    },
    attributeGroups: async (_, { filters = [] }) => {
      const query = getAttributeGroupsBaseQuery();
      const root = new AttributeGroupCollection(query);
      await root.init(filters);
      return root;
    }
  },
  AttributeGroup: {
    attributes: async (group, { filters = [] }) => {
      const query = getAttributesBaseQuery();
      query
        .innerJoin('attribute_group_link')
        .on('attribute.attribute_id', '=', 'attribute_group_link.attribute_id');
      query.where('attribute_group_link.group_id', '=', group.attributeGroupId);
      const root = new AttributeCollection(query);
      await root.init(filters);
      return root;
    },
    updateApi: (group) => buildUrl('updateAttributeGroup', { id: group.uuid })
  },

  Attribute: {
    groups: async (attribute, { filters = [] }) => {
      const query = getAttributeGroupsBaseQuery();
      query
        .innerJoin('attribute_group_link')
        .on(
          'attribute_group.attribute_group_id',
          '=',
          'attribute_group_link.group_id'
        );
      query.where(
        'attribute_group_link.attribute_id',
        '=',
        attribute.attributeId
      );
      const root = new AttributeGroupCollection(query);
      await root.init(filters);
      return root;
    },
    editUrl: ({ uuid }) => buildUrl('attributeEdit', { id: uuid }),
    updateApi: (attribute) =>
      buildUrl('updateAttribute', { id: attribute.uuid }),
    deleteApi: (attribute) =>
      buildUrl('deleteAttribute', { id: attribute.uuid })
  }
};
