const { execute } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    'ALTER TABLE setting ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER setting_id'
  );
  await execute(
    connection,
    "UPDATE setting SET uuid = replace(uuid(),'-','') WHERE uuid = ''"
  );
  await execute(
    connection,
    "ALTER TABLE setting MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE setting ADD UNIQUE KEY `SETTING_UUID` (`uuid`)'
  );
};
