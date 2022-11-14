const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `DROP TABLE IF EXISTS \`customer_address\``);
  await execute(pool, `DROP TABLE IF EXISTS \`customer\``);

  await execute(pool, `CREATE TABLE \`customer\` (
  \`customer_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`uuid\` varchar(255) DEFAULT replace(uuid(),'-',''),
  \`status\` smallint(6) NOT NULL DEFAULT 1,
  \`group_id\` int(10) unsigned DEFAULT NULL,
  \`email\` char(255) NOT NULL,
  \`password\` char(255) NOT NULL,
  \`full_name\` char(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`customer_id\`),
  UNIQUE KEY \`EMAIL_UNIQUE\` (\`email\`),
  KEY \`FK_CUSTOMER_GROUP\` (\`group_id\`),
  CONSTRAINT \`FK_CUSTOMER_GROUP\` FOREIGN KEY (\`group_id\`) REFERENCES \`customer_group\` (\`customer_group_id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Customer';
`);

  await execute(pool, `CREATE TABLE \`customer_address\` (
  \`customer_address_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`uuid\` varchar(255) DEFAULT replace(uuid(),'-',''),
  \`customer_id\` int(10) unsigned NOT NULL,
  \`full_name\` varchar(255) DEFAULT NULL,
  \`telephone\` varchar(255) DEFAULT NULL,
  \`address_1\` varchar(255) DEFAULT NULL,
  \`address_2\` varchar(255) DEFAULT NULL,
  \`postcode\` varchar(255) DEFAULT NULL,
  \`city\` varchar(255) DEFAULT NULL,
  \`province\` varchar(255) DEFAULT NULL,
  \`country\` varchar(255) NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  \`is_default\` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (\`customer_address_id\`),
  KEY \`FK_CUSTOMER_ADDRESS_LINK\` (\`customer_id\`),
  CONSTRAINT \`FK_CUSTOMER_ADDRESS_LINK\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customer\` (\`customer_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Customer address';
`);
};
