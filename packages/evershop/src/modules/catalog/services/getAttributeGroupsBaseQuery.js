const { select } = require('@evershop/postgres-query-builder');

module.exports.getAttributeGroupsBaseQuery = () => select().from('attribute_group');
