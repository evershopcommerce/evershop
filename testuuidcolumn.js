const { execute, insert, select } = require('@evershop/mysql-query-builder');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');

// create the connection to database
const connection = mysql.createConnection({
  host: 'db.cloud.evershop.io',
  user: '01GNJ1MBEF8BDGMR6V96V9WZ12',
  database: '01GNJ1MBC5P4C80A2BKPA87HCZ',
  password: '01GNJ1MBEFVERZH2GFW3STM9BW'
});

(async () => {
  await execute(connection, `DROP TABLE IF EXISTS \`customer\``);
  await execute(connection, `CREATE TABLE \`customer\` (
    \`admin_user_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
    \`status\` smallint(5) unsigned NOT NULL,
    \`email\` varchar(255) NOT NULL,
    PRIMARY KEY (\`admin_user_id\`),
    UNIQUE KEY \`EMAIL_UNIQUE\` (\`email\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Admin user';
  `);

  await insert('customer').given({
    status: 1,
    email: 'email@gmail.com'
  }).execute(connection);

  await insert('customer').given({
    status: 1,
    email: 'email2@gmail.com'
  }).execute(connection);


  const users = await select().from('customer').execute(connection);
  console.log(users);

  await execute(connection, `ALTER TABLE customer ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER admin_user_id`);

  await execute(connection, `UPDATE customer SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);


  await execute(connection, `ALTER TABLE customer MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(connection, `ALTER TABLE customer ADD UNIQUE KEY \`UUID\` (\`uuid\`)`);


  await insert('customer').given({
    status: 1,
    email: 'email3@gmail.com'
  }).execute(connection);

  await insert('customer').given({
    status: 1,
    email: 'email4@gmail.com'
  }).execute(connection);


  const users2 = await select().from('customer').execute(connection);
  console.log(users2);

  connection.query(
    'DESCRIBE customer',
    function (err, results, fields) {
      console.log(results); // results contains rows returned by server
      console.log(fields); // fields contains extra meta data about results, if available
    }
  );
})()