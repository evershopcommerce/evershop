import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * Blog module — initial schema (spec: specifications/blog-module.md §4).
 *
 * Tables are created in FK-dependency order: blog_category + blog_tag first,
 * then blog_post (FK → blog_category), then the description / pivot / comment /
 * reaction tables. Indexes (§4.7) and the url_key triggers (§4.8) follow.
 *
 * NOTE on cross-module FKs: `blog_post.author_id` (→ auth.admin_user) and
 * `blog_comment.customer_id` (→ customer.customer) are kept as plain INT columns
 * WITHOUT a database foreign key — module migration order across modules is not
 * guaranteed, so a hard FK here could run before `admin_user`/`customer` exist.
 * The resolvers tolerate a missing/orphaned id (return null). Visibility on the
 * storefront is `status = 1` only (no scheduler — §4.6).
 */
export default async (connection: PoolClient): Promise<void> => {
  // ── blog_category ──────────────────────────────────────────────────────────
  await execute(
    connection,
    `CREATE TABLE "blog_category" (
      "blog_category_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "status" smallint NOT NULL DEFAULT 1,
      "comment_policy" varchar NOT NULL DEFAULT 'moderated',
      "position" smallint DEFAULT NULL,
      "meta_data" jsonb NOT NULL DEFAULT '{}',
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BLOG_CATEGORY_UUID_UNIQUE" UNIQUE ("uuid")
    )`
  );

  await execute(
    connection,
    `CREATE TABLE "blog_category_description" (
      "blog_category_description_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "blog_category_description_blog_category_id" INT NOT NULL,
      "name" varchar NOT NULL,
      "short_description" text DEFAULT NULL,
      "url_key" varchar NOT NULL,
      "meta_title" text DEFAULT NULL,
      "meta_description" text DEFAULT NULL,      CONSTRAINT "BLOG_CATEGORY_DESC_UNIQUE" UNIQUE ("blog_category_description_blog_category_id"),
      CONSTRAINT "BLOG_CATEGORY_URL_KEY_UNIQUE" UNIQUE ("url_key"),
      CONSTRAINT "FK_BLOG_CATEGORY_DESC" FOREIGN KEY ("blog_category_description_blog_category_id")
        REFERENCES "blog_category" ("blog_category_id") ON DELETE CASCADE
    )`
  );

  // ── blog_tag ───────────────────────────────────────────────────────────────
  await execute(
    connection,
    `CREATE TABLE "blog_tag" (
      "blog_tag_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "name" varchar NOT NULL,
      "url_key" varchar NOT NULL,
      "meta_title" text DEFAULT NULL,
      "meta_description" text DEFAULT NULL,      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BLOG_TAG_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "BLOG_TAG_URL_KEY_UNIQUE" UNIQUE ("url_key")
    )`
  );

  // ── blog_post (FK → blog_category) ─────────────────────────────────────────
  await execute(
    connection,
    `CREATE TABLE "blog_post" (
      "blog_post_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "status" smallint NOT NULL DEFAULT 0,
      "category_id" INT DEFAULT NULL,
      "author_id" INT DEFAULT NULL,
      "thumbnail" varchar DEFAULT NULL,
      "reaction_counts" jsonb NOT NULL DEFAULT '{}',
      "comment_count" INT NOT NULL DEFAULT 0,
      "reading_time" INT DEFAULT NULL,
      "published_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      "meta_data" jsonb NOT NULL DEFAULT '{}',
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BLOG_POST_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FK_BLOG_POST_CATEGORY" FOREIGN KEY ("category_id")
        REFERENCES "blog_category" ("blog_category_id") ON DELETE SET NULL
    )`
  );

  await execute(
    connection,
    `CREATE TABLE "blog_post_description" (
      "blog_post_description_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "blog_post_description_blog_post_id" INT NOT NULL,
      "name" varchar NOT NULL,
      "short_description" text DEFAULT NULL,
      "description" text DEFAULT NULL,
      "url_key" varchar NOT NULL,
      "meta_title" text DEFAULT NULL,
      "meta_description" text DEFAULT NULL,      CONSTRAINT "BLOG_POST_DESC_UNIQUE" UNIQUE ("blog_post_description_blog_post_id"),
      CONSTRAINT "BLOG_POST_URL_KEY_UNIQUE" UNIQUE ("url_key"),
      CONSTRAINT "FK_BLOG_POST_DESC" FOREIGN KEY ("blog_post_description_blog_post_id")
        REFERENCES "blog_post" ("blog_post_id") ON DELETE CASCADE
    )`
  );

  // ── blog_post_tag (M2M pivot) ──────────────────────────────────────────────
  await execute(
    connection,
    `CREATE TABLE "blog_post_tag" (
      "blog_post_tag_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "post_id" INT NOT NULL,
      "tag_id" INT NOT NULL,
      CONSTRAINT "BLOG_POST_TAG_UNIQUE" UNIQUE ("post_id", "tag_id"),
      CONSTRAINT "FK_BPT_POST" FOREIGN KEY ("post_id")
        REFERENCES "blog_post" ("blog_post_id") ON DELETE CASCADE,
      CONSTRAINT "FK_BPT_TAG" FOREIGN KEY ("tag_id")
        REFERENCES "blog_tag" ("blog_tag_id") ON DELETE CASCADE
    )`
  );

  // ── blog_comment (self-FK for threading) ───────────────────────────────────
  await execute(
    connection,
    `CREATE TABLE "blog_comment" (
      "blog_comment_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      "post_id" INT NOT NULL,
      "parent_id" INT DEFAULT NULL,
      "customer_id" INT DEFAULT NULL,
      "name" varchar NOT NULL,
      "email" varchar NOT NULL,
      "comment" text NOT NULL,
      "status" varchar NOT NULL DEFAULT 'pending',
      "like_count" INT NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BLOG_COMMENT_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "FK_COMMENT_POST" FOREIGN KEY ("post_id")
        REFERENCES "blog_post" ("blog_post_id") ON DELETE CASCADE,
      CONSTRAINT "FK_COMMENT_PARENT" FOREIGN KEY ("parent_id")
        REFERENCES "blog_comment" ("blog_comment_id") ON DELETE CASCADE
    )`
  );

  // ── blog_reaction (post reactions + comment likes; one per visitor/entity) ──
  await execute(
    connection,
    `CREATE TABLE "blog_reaction" (
      "blog_reaction_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "entity_type" varchar NOT NULL,
      "entity_id" INT NOT NULL,
      "reaction_type" varchar NOT NULL DEFAULT 'like',
      "fingerprint" varchar NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BLOG_REACTION_UNIQUE" UNIQUE ("entity_type", "entity_id", "fingerprint")
    )`
  );

  // ── Indexes (§4.7) ─────────────────────────────────────────────────────────
  await execute(
    connection,
    `CREATE INDEX "BLOG_POST_CATEGORY_IDX" ON "blog_post" ("category_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_POST_AUTHOR_IDX" ON "blog_post" ("author_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_POST_STATUS_PUB_IDX" ON "blog_post" ("status", "published_at")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_POST_TAG_POST_IDX" ON "blog_post_tag" ("post_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_POST_TAG_TAG_IDX" ON "blog_post_tag" ("tag_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_COMMENT_POST_IDX" ON "blog_comment" ("post_id", "status")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_COMMENT_PARENT_IDX" ON "blog_comment" ("parent_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "BLOG_REACTION_ENTITY_IDX" ON "blog_reaction" ("entity_type", "entity_id")`
  );

  // ── url_key triggers (§4.8) ────────────────────────────────────────────────
  // build_blog_url_key() slugifies NEW.name when url_key is NULL. Blog-specific
  // (separate from catalog's build_url_key) so blog slugs stay clean — no random
  // numeric suffix is appended. Duplicate names therefore collide on the url_key
  // UNIQUE constraint; the author sets an explicit url_key to disambiguate.
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION build_blog_url_key() RETURNS TRIGGER AS $$
    DECLARE
      url_key TEXT;
    BEGIN
      IF(NEW.url_key IS NULL) THEN
        url_key = regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g');
        url_key = regexp_replace(url_key, '^-|-$', '', 'g');
        url_key = lower(url_key);
        NEW.url_key = url_key;
      ELSE
        IF (NEW.url_key ~ '[/\\#]') THEN
          RAISE EXCEPTION 'Invalid url_key: %', NEW.url_key;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  await execute(
    connection,
    `CREATE TRIGGER "BUILD_BLOG_POST_URL_KEY"
    BEFORE INSERT OR UPDATE ON blog_post_description
    FOR EACH ROW EXECUTE PROCEDURE build_blog_url_key();`
  );
  await execute(
    connection,
    `CREATE TRIGGER "BUILD_BLOG_CATEGORY_URL_KEY"
    BEFORE INSERT OR UPDATE ON blog_category_description
    FOR EACH ROW EXECUTE PROCEDURE build_blog_url_key();`
  );
  await execute(
    connection,
    `CREATE TRIGGER "BUILD_BLOG_TAG_URL_KEY"
    BEFORE INSERT OR UPDATE ON blog_tag
    FOR EACH ROW EXECUTE PROCEDURE build_blog_url_key();`
  );
};
