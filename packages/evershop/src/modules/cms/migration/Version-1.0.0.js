const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "cms_page" (
  "cms_page_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "layout" varchar NOT NULL,
  "status" boolean DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CMS_PAGE_UUID" UNIQUE ("uuid")
)`
  );

  await execute(
    connection,
    `CREATE TABLE "cms_page_description" (
  "cms_page_description_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "cms_page_description_cms_page_id" INT,
  "url_key" varchar NOT NULL,
  "name" varchar NOT NULL,
  "content" text DEFAULT NULL,
  "meta_title" varchar DEFAULT NULL,
  "meta_keywords" varchar DEFAULT NULL,
  "meta_description" text DEFAULT NULL,
  CONSTRAINT "PAGE_ID_UNIQUE" UNIQUE ("cms_page_description_cms_page_id"),
  CONSTRAINT "URL_KEY_UNIQUE" UNIQUE ("url_key"),
  CONSTRAINT "FK_CMS_PAGE_DESCRIPTION" FOREIGN KEY ("cms_page_description_cms_page_id") REFERENCES "cms_page" ("cms_page_id") ON DELETE CASCADE ON UPDATE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CMS_PAGE_DESCRIPTION" ON "cms_page_description" ("cms_page_description_cms_page_id")`
  );
};
