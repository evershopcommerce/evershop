const { select } = require('@evershop/postgres-query-builder');

module.exports.getAttributesBaseQuery = () => select().from('attribute');
