import { randomUUID } from 'node:crypto';
import { createTestAdmin, deleteTestAdmin, type TestAdmin } from './auth.js';
import { getDb } from './db.js';

/**
 * Fixtures for the CSV import specs (spec § 11.4): a world to import into, the
 * rows to read back, and the sweep.
 *
 * Convention (mirrors productDb.ts and metafieldDb.ts): every file, key, sku and
 * e-mail address that an import spec makes starts with `e2e-imp` / `E2E-IMP`, or
 * ends with `@e2e-import.invalid`, so that an interrupted run is swept
 * idempotently by `sweepImportWorld()`. The suite uses the database of the dev
 * server; a spec must not touch a row it did not make.
 */
export const E2E_FILE_PREFIX = 'e2e-imp';
export const E2E_EMAIL_DOMAIN = 'e2e-import.invalid';

export async function sweepImportWorld(): Promise<void> {
  const db = getDb();
  // A failure a spec installed must never outlive it.
  await allowCategoryWrites();
  // The chunks and the problems of a job follow it (foreign keys).
  await db.query(`DELETE FROM import_job WHERE file_name LIKE 'e2e-%'`);
  // The addresses of a customer follow it.
  await db.query(`DELETE FROM customer WHERE email LIKE $1`, [
    `%@${E2E_EMAIL_DOMAIN}`
  ]);
  await db.query(`DELETE FROM product WHERE sku LIKE 'E2E-IMP-%'`);
  await db.query(
    `DELETE FROM category WHERE category_id IN (
       SELECT category_description_category_id FROM category_description
       WHERE url_key LIKE 'e2e-imp-%')`
  );
  await db.query(
    `DELETE FROM url_rewrite WHERE request_path LIKE '%e2e-imp-%'
        OR request_path LIKE '%e2e-imp-%'`
  );
}

export interface JobRow {
  uuid: string;
  entity: string;
  mode: string;
  status: string;
  stage: string | null;
  file_name: string;
  counts: Record<string, any>;
  error_message: string | null;
  started_at: Date | null;
  created_by: number | null;
}

export async function jobsByFile(fileName: string): Promise<JobRow[]> {
  const { rows } = await getDb().query<JobRow>(
    `SELECT uuid, entity, mode, status, stage, file_name, counts, error_message,
            started_at, created_by
       FROM import_job WHERE file_name = $1 ORDER BY import_job_id`,
    [fileName]
  );
  return rows;
}

/** A job that the page did not make: a state that is hard to reach through the page, or another admin's. */
export async function insertJob(job: {
  entity: string;
  status: string;
  fileName?: string;
  createdBy?: number | null;
  counts?: Record<string, number>;
  /** Wrote rows: `started_at` is set. */
  wrote?: boolean;
  mode?: string;
}): Promise<{ uuid: string; fileName: string }> {
  const fileName = job.fileName ?? `e2e-${E2E_FILE_PREFIX}-${randomUUID().slice(0, 8)}.csv`;
  const { rows } = await getDb().query<{ uuid: string }>(
    `INSERT INTO import_job
       (entity, mode, status, stage, file_name, file_size, counts, created_by,
        started_at, heartbeat_at)
     VALUES ($1, $2, $3::varchar, $4, $5, 100, $6::jsonb, $7,
             CASE WHEN $8::boolean THEN now() END,
             CASE WHEN $3::varchar IN ('running', 'queued', 'validating') THEN now() END)
     RETURNING uuid`,
    [
      job.entity,
      job.mode ?? 'upsert',
      job.status,
      job.status === 'running' ? 'writing' : null,
      fileName,
      JSON.stringify({ total: 100, ...job.counts }),
      job.createdBy ?? null,
      job.wrote ?? false
    ]
  );
  return { uuid: rows[0].uuid, fileName };
}

export async function categoryRow(urlKey: string) {
  const { rows } = await getDb().query<{
    category_id: number;
    parent_id: number | null;
    status: boolean;
    name: string;
    description: string | null;
  }>(
    `SELECT c.category_id, c.parent_id, c.status, d.name, d.description
       FROM category c
       JOIN category_description d ON d.category_description_category_id = c.category_id
      WHERE d.url_key = $1`,
    [urlKey]
  );
  return rows[0] ?? null;
}

export async function countCategories(prefix = 'e2e-imp-%'): Promise<number> {
  const { rows } = await getDb().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM category_description WHERE url_key LIKE $1`,
    [prefix]
  );
  return rows[0].n;
}

/** A category made by SQL, as another part of the store would have made it. */
export async function insertCategory(urlKey: string, name: string): Promise<number> {
  const db = getDb();
  const { rows } = await db.query<{ category_id: number }>(
    `INSERT INTO category (status) VALUES (true) RETURNING category_id`
  );
  await db.query(
    `INSERT INTO category_description (category_description_category_id, name, url_key, description, short_description)
     VALUES ($1, $2, $3, '[]', '')`,
    [rows[0].category_id, name, urlKey]
  );
  return rows[0].category_id;
}

export async function deleteCategory(urlKey: string): Promise<void> {
  await getDb().query(
    `DELETE FROM category WHERE category_id IN (
       SELECT category_description_category_id FROM category_description WHERE url_key = $1)`,
    [urlKey]
  );
}

export async function customerRow(email: string) {
  const { rows } = await getDb().query<{
    customer_id: number;
    full_name: string;
    status: number;
    group_id: number | null;
  }>(
    `SELECT customer_id, full_name, status, group_id FROM customer WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function addressCount(email: string): Promise<number> {
  const { rows } = await getDb().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM customer_address a
       JOIN customer c ON c.customer_id = a.customer_id WHERE c.email = $1`,
    [email]
  );
  return rows[0].n;
}

export async function productRow(sku: string) {
  const { rows } = await getDb().query<{ product_id: number; price: string; status: boolean }>(
    `SELECT product_id, price, status FROM product WHERE sku = $1`,
    [sku]
  );
  return rows[0] ?? null;
}

/** The names that a product file refers to, read from the store: they differ between stores. */
export async function referenceNames(): Promise<{ group: string; taxClass: string | null }> {
  const db = getDb();
  const group = await db.query<{ group_name: string }>(
    `SELECT group_name FROM attribute_group ORDER BY attribute_group_id LIMIT 1`
  );
  const tax = await db.query<{ name: string }>(
    `SELECT name FROM tax_class ORDER BY tax_class_id LIMIT 1`
  );
  if (group.rows.length === 0) {
    throw new Error('No attribute group in the store: a product cannot be imported.');
  }
  return { group: group.rows[0].group_name, taxClass: tax.rows[0]?.name ?? null };
}

/** Another admin, for the questions that are asked when a job belongs to somebody else (D-32). */
export async function createOtherAdmin(): Promise<TestAdmin> {
  const admin = await createTestAdmin();
  await getDb().query(`UPDATE admin_user SET full_name = 'E2E Other Admin' WHERE admin_user_id = $1`, [
    admin.adminUserId
  ]);
  return admin;
}

export async function deleteOtherAdmin(admin: TestAdmin): Promise<void> {
  await deleteTestAdmin(admin.adminUserId);
}

/** The keys that `refuseCategoryWrites` makes the database refuse. */
export const FAIL_KEY_PREFIX = 'e2e-imp-fail-';

/**
 * Makes the database refuse to write a category whose `url_key` starts with
 * `e2e-imp-fail-`: a failure that only the write can show (the check cannot see a
 * trigger), as a full disk or a conflict with another admin would be. Only keys
 * with that prefix are touched. `allowCategoryWrites` takes it away, and so does
 * the sweep.
 */
export async function refuseCategoryWrites(): Promise<void> {
  const db = getDb();
  await db.query(
    `CREATE OR REPLACE FUNCTION e2e_import_refuse() RETURNS trigger LANGUAGE plpgsql AS $$
     BEGIN
       IF NEW.url_key LIKE '${FAIL_KEY_PREFIX}%' THEN
         RAISE EXCEPTION 'e2e: the database refuses this category';
       END IF;
       RETURN NEW;
     END $$`
  );
  await db.query(`DROP TRIGGER IF EXISTS e2e_import_refuse ON category_description`);
  await db.query(
    `CREATE TRIGGER e2e_import_refuse BEFORE INSERT OR UPDATE ON category_description
       FOR EACH ROW EXECUTE FUNCTION e2e_import_refuse()`
  );
}

export async function allowCategoryWrites(): Promise<void> {
  const db = getDb();
  await db.query(`DROP TRIGGER IF EXISTS e2e_import_refuse ON category_description`);
  await db.query(`DROP FUNCTION IF EXISTS e2e_import_refuse()`);
}

/** The categories with this prefix, by key, for a comparison of lists. */
export async function categoryKeys(prefix = 'e2e-imp-%'): Promise<string[]> {
  const { rows } = await getDb().query<{ url_key: string }>(
    `SELECT url_key FROM category_description WHERE url_key LIKE $1 ORDER BY url_key COLLATE "C"`,
    [prefix]
  );
  return rows.map((r) => r.url_key);
}

/** The images of a product, the main one first, as the store keeps them (a path in its file storage). */
export async function productImages(sku: string): Promise<string[]> {
  const { rows } = await getDb().query<{ origin_image: string }>(
    `SELECT i.origin_image FROM product_image i
       JOIN product p ON p.product_id = i.product_image_product_id
      WHERE p.sku = $1 ORDER BY i.is_main DESC, i.product_image_id`,
    [sku]
  );
  return rows.map((r) => r.origin_image);
}
