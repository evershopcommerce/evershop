const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Drop the layout column in the cms_page table
  await execute(connection, `ALTER TABLE cms_page DROP COLUMN layout`);
};
