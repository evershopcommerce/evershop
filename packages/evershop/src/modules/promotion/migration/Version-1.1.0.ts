import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from '@evershop/postgres-query-builder';

export default async (connection: PoolClient): Promise<void> => {
  // Landing page: a promotion-owned entity served at root-level `/<url_key>`
  // (via url_rewrite → the landingPageView route). Single table — no i18n
  // `_description` split, and its body is entity-scoped page-builder widgets,
  // not a stored `content` field. See wiki/landing-pages.md.
  await execute(
    connection,
    `CREATE TABLE "landing_page" (
  "landing_page_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "status" boolean NOT NULL DEFAULT FALSE,
  "name" varchar NOT NULL,
  "url_key" varchar NOT NULL,
  "description" text DEFAULT NULL,
  "meta_title" varchar DEFAULT NULL,
  "meta_description" text DEFAULT NULL,
  "publish_start" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "publish_end" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LANDING_PAGE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "LANDING_PAGE_URL_KEY_UNIQUE" UNIQUE ("url_key")
)`
  );
};
