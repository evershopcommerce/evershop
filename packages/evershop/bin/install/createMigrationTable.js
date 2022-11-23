const { execute } = require("@evershop/mysql-query-builder");

module.exports.createMigrationTable = async function createMigrationTable(connection) {
  await execute(connection, `CREATE TABLE \`migration\` (
        \`migration_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`module\` char(255) NOT NULL,
        \`version\` char(255) NOT NULL,
        \`status\` char(255) NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
        \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`migration_id\`),
        UNIQUE KEY \`MODULE_UNIQUE\` (\`module\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Migration';
    `);
};