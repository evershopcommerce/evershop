const { execute } = require('@evershop/postgres-query-builder');

module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE language (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),

        code varchar(20) NOT NULL,
        name varchar(30),
        icon text,
        is_default int DEFAULT 1,
        is_disabled int DEFAULT 0,

        CONSTRAINT "UQ_LANGUAGE_CODE" UNIQUE ("code")
      );
    `
  );

  await execute(
    connection,
    `CREATE TABLE translation (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),

        entity_id varchar(50) NOT NULL,
        entity_name varchar(50) NOT NULL,
        entity_attribute varchar(100),
        value text,
        language_code varchar(20) NOT NULL,

        CONSTRAINT "FK_TRANSLATION_LANGUAGE" FOREIGN KEY ("language_code") REFERENCES language ("code") ON DELETE SET NULL
    )`
  );

  // Customer
  await execute(
    connection,
    `ALTER TABLE customer
    ADD COLUMN language_code varchar(20),
    ADD CONSTRAINT "FK_CUSTOMER_LANGUAGE" FOREIGN KEY ("language_code") REFERENCES "language" ("code") ON DELETE SET NULL;`
  );

  await execute(
    connection,
    `INSERT INTO language (code, name, icon, is_default)
        VALUES ('USD', NULL, NULL, 1);`
  );

  //
};
