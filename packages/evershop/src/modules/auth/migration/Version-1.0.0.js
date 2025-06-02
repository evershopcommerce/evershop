import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "admin_user" (
  "admin_user_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "status" boolean NOT NULL DEFAULT TRUE,
  "email" varchar NOT NULL,
  "password" varchar NOT NULL,
  "full_name" varchar DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ADMIN_USER_EMAIL_UNIQUE" UNIQUE ("email"),
  CONSTRAINT "ADMIN_USER_UUID_UNIQUE" UNIQUE ("uuid")
);`
  );

  await execute(
    connection,
    `CREATE TABLE "user_token_secret" (
  "user_token_secret_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "sid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "user_id" varchar NOT NULL,
  "secret" varchar NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "USER_TOKEN_SID_UNIQUE" UNIQUE ("sid"),
  CONSTRAINT "USER_TOKEN_SECRET_UNIQUE" UNIQUE ("secret")
);`
  );
};
