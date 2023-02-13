const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(
    pool,
    "ALTER TABLE admin_user MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    pool,
    'ALTER TABLE admin_user ADD UNIQUE KEY `ADMIN_USER_UUID` (`uuid`)'
  );

  await execute(
    pool,
    'ALTER TABLE user_token_secret ADD COLUMN sid varchar(60) NOT NULL AFTER user_id'
  );
  await execute(
    pool,
    'ALTER TABLE user_token_secret DROP INDEX `USER_TOKEN_USER_ID`'
  );
  await execute(
    pool,
    "UPDATE user_token_secret SET sid = replace(uuid(),'-','')"
  );
  await execute(
    pool,
    'ALTER TABLE user_token_secret ADD UNIQUE KEY `USER_TOKEN_SID_UUID` (`sid`)'
  );
  await execute(
    pool,
    'ALTER TABLE user_token_secret ADD UNIQUE KEY `USER_TOKEN_SECRET_UUID` (`secret`)'
  );
};
