const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE setting ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER setting_id`);
  await execute(pool, `UPDATE setting SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE setting MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE setting ADD UNIQUE KEY \`SETTING_UUID\` (\`uuid\`)`);
};
