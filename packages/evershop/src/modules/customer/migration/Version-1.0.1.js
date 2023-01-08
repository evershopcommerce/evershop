const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE customer MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE customer ADD UNIQUE KEY \`CUSTOMER_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE customer_address MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE customer_address ADD UNIQUE KEY \`CUSTOMER_ADDRESS_UUID\` (\`uuid\`)`);
  await execute(pool, `ALTER TABLE customer_address ADD KEY \`FK_CUSTOMER\` (\`customer_id\`)`);

};