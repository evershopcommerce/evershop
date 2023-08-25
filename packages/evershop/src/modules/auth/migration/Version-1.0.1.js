const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Remove user_token_secret table
  await execute(connection, `DROP TABLE IF EXISTS user_token_secret;`);

  // Create a session table following the `connect-pg-simple` package
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS session (
      sid varchar NOT NULL COLLATE "default",
      sess json NOT NULL,
      expire timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
    ALTER TABLE session ADD CONSTRAINT "SESSION_PKEY" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;`
  );

  await execute(
    connection,
    `CREATE INDEX "IDX_SESSION_EXPIRE" ON "session" ("expire");`
  );
};
