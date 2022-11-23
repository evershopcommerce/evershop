const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `DROP TABLE IF EXISTS \`setting\``);
  await execute(pool, `CREATE TABLE \`setting\` (
  \`setting_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`value\` text DEFAULT NULL,
  \`is_json\` smallint(6) NOT NULL DEFAULT '0',
  PRIMARY KEY (\`setting_id\`),
  UNIQUE KEY \`UNIQUE_SETTING_NAME\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Setting';
`);
};
