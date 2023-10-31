
async function testDatabaseExists(db) {
  const { Client } = require('pg');

  const client = new Client({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password
  });
  await client.connect();
  const dbName = db.database;
  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname='${dbName}'`
  );

  if (res.rows.length === 0) {
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database ${dbName} created. Contiune...`);
    await client.end();
    return true;
  } else {
    console.log(`Database ${dbName} already exists. Contiune...`);
    await client.end();
    return true;
  }
}
exports.testDatabaseExists = testDatabaseExists;
