import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Create a reset_password_token table
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS reset_password_token (
      reset_password_token_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      customer_id INT NOT NULL,
      token text NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "FK_RESET_PASSWORD_TOKEN_CUSTOMER" FOREIGN KEY ("customer_id") REFERENCES "customer" ("customer_id") ON DELETE CASCADE
    );`
  );
};
