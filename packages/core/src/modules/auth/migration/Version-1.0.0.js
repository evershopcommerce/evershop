const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `DROP TABLE IF EXISTS \`admin_user\``);
  await execute(pool, `CREATE TABLE \`admin_user\` (
  \`admin_user_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`uuid\` varchar(255) DEFAULT replace(uuid(),'-',''),
  \`status\` smallint(5) unsigned NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`password\` varchar(255) NOT NULL,
  \`full_name\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`admin_user_id\`),
  UNIQUE KEY \`EMAIL_UNIQUE\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Admin user';
`);

  await execute(pool, `CREATE TABLE \`user_token_secret\` (
  \`user_token_secret_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`user_id\` varchar(255) NOT NULL,
  \`secret\` varchar(255) NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`user_token_secret_id\`),
  UNIQUE KEY \`USER_TOKEN_USER_ID\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='User token secret';
`);
};
