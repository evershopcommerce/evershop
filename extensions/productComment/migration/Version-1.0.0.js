const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('@evershop/evershop/src/lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `CREATE TABLE \`product_comment\` (
  \`comment_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`product_id\` int(10) unsigned NOT NULL,
  \`user_name\` varchar(255) NOT NULL,
  \`comment\` text DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`comment_id\`),
  CONSTRAINT \`FK_PRODUCT_COMMENT\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
};
