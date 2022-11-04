const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `CREATE TABLE IF NOT EXISTS \`setting\` (
  \`setting_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`value\` text DEFAULT NULL,
  \`json\` smallint(6) NOT NULL,
  PRIMARY KEY (\`setting_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Setting';
`);
};
