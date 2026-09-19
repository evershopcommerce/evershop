import {
  commit,
  insert,
  rollback,
  select,
  startTransaction,
  type PoolClient
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import type { PackageRow } from './types.js';

export interface PackagePayload {
  name?: string;
  length?: number;
  width?: number;
  height?: number;
  /** Tare — the EMPTY package's own weight, in the store's weight unit. */
  weight?: number;
  is_default?: boolean;
}

function toFiniteNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Validate a package payload. `partial = true` (update) allows omitted
 * fields; present fields are always validated. Mirrors the DB CHECK
 * constraints so admins get readable errors instead of constraint codes:
 * length/width > 0, height >= 0 (a flat envelope is height 0), tare >= 0.
 */
export function validatePackagePayload(
  payload: PackagePayload,
  partial = false
): void {
  const { name } = payload;
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Package name is required');
    }
  }
  const rules: Array<[string, number | undefined, (n: number) => boolean]> = [
    ['length', toFiniteNumber(payload.length), (n) => n > 0],
    ['width', toFiniteNumber(payload.width), (n) => n > 0],
    ['height', toFiniteNumber(payload.height), (n) => n >= 0],
    ['weight', toFiniteNumber(payload.weight), (n) => n >= 0]
  ];
  for (const [field, value, ok] of rules) {
    if (!partial && value === undefined && field !== 'weight') {
      throw new Error(`Package ${field} is required`);
    }
    if (value !== undefined && (Number.isNaN(value) || !ok(value))) {
      throw new Error(
        field === 'height'
          ? 'Package height must be 0 (envelope) or greater'
          : field === 'weight'
          ? 'Package weight must be 0 or greater'
          : `Package ${field} must be greater than 0`
      );
    }
  }
}

/** Unset the current default inside the caller's transaction (default swap). */
async function unsetCurrentDefault(connection: PoolClient): Promise<void> {
  await connection.query(
    `UPDATE "package" SET "is_default" = FALSE WHERE "is_default" = TRUE`
  );
}

function friendlyDbError(e: Error & { code?: string }): Error {
  if (e.code === '23505') {
    return new Error('A package with this name already exists');
  }
  return e;
}

// NOTE: every impl below is a NAMED function expression whose intrinsic name
// is the hook key (`hookable()` keys hooks by fn.name — a `fooImpl`
// declaration would silently kill hookBefore/After('foo')).

const createPackageImpl = async function createPackage(
  payload: PackagePayload
): Promise<PackageRow> {
  validatePackagePayload(payload);
  const connection = await getConnection();
  try {
    await startTransaction(connection);
    if (payload.is_default === true) {
      await unsetCurrentDefault(connection);
    }
    const row = await insert('package')
      .given({
        name: (payload.name as string).trim(),
        length: payload.length,
        width: payload.width,
        height: payload.height,
        weight: payload.weight ?? 0,
        is_default: payload.is_default === true
      })
      .execute(connection);
    await commit(connection);
    return row as PackageRow;
  } catch (e) {
    await rollback(connection);
    throw friendlyDbError(e as Error & { code?: string });
  }
};

const updatePackageImpl = async function updatePackage(
  uuid: string,
  payload: PackagePayload
): Promise<PackageRow> {
  validatePackagePayload(payload, true);
  const connection = await getConnection();
  try {
    await startTransaction(connection);
    const current = (await select()
      .from('package')
      .where('uuid', '=', uuid)
      .load(connection)) as PackageRow | null;
    if (!current) {
      throw new Error(`Package not found: ${uuid}`);
    }
    // The default cannot be turned off directly — there must always be a
    // default for the product form to preselect. Make another package the
    // default instead (which swaps this one off).
    if (payload.is_default === false && current.is_default) {
      throw new Error(
        'This is the default package. Set another package as default first.'
      );
    }
    if (payload.is_default === true && !current.is_default) {
      await unsetCurrentDefault(connection);
    }

    // Raw parameterized UPDATE: `.given()` JSON-stringifies object values and
    // has no raw-SQL escape on the write side, so `updated_at = NOW()` can't
    // go through the builder. Only user values cross the bind boundary.
    const sets: string[] = [`"updated_at" = NOW()`];
    const params: unknown[] = [];
    const bind = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`"${column}" = $${params.length}`);
    };
    if (payload.name !== undefined) bind('name', payload.name.trim());
    if (payload.length !== undefined) bind('length', payload.length);
    if (payload.width !== undefined) bind('width', payload.width);
    if (payload.height !== undefined) bind('height', payload.height);
    if (payload.weight !== undefined) bind('weight', payload.weight);
    if (payload.is_default !== undefined)
      bind('is_default', payload.is_default);
    params.push(uuid);
    const result = await connection.query(
      `UPDATE "package" SET ${sets.join(', ')} WHERE "uuid" = $${
        params.length
      } RETURNING *`,
      params
    );
    await commit(connection);
    return result.rows[0] as PackageRow;
  } catch (e) {
    await rollback(connection);
    throw friendlyDbError(e as Error & { code?: string });
  }
};

const deletePackageImpl = async function deletePackage(
  uuid: string
): Promise<void> {
  const current = (await select()
    .from('package')
    .where('uuid', '=', uuid)
    .load(pool)) as PackageRow | null;
  if (!current) {
    throw new Error(`Package not found: ${uuid}`);
  }
  if (current.is_default) {
    throw new Error(
      'The default package cannot be deleted. Set another package as default first.'
    );
  }
  try {
    await pool.query(`DELETE FROM "package" WHERE "uuid" = $1`, [uuid]);
  } catch (e) {
    // FK RESTRICT from product.package_id — report how many products block it.
    if ((e as Error & { code?: string }).code === '23503') {
      const count = await pool.query(
        `SELECT COUNT(*)::int AS count FROM "product" WHERE "package_id" = $1`,
        [current.package_id]
      );
      throw new Error(
        `This package is used by ${count.rows[0].count} product(s). Assign those products to another package first.`
      );
    }
    throw e;
  }
};

export const createPackage = hookable(createPackageImpl, {});
export const updatePackage = hookable(updatePackageImpl, {});
export const deletePackage = hookable(deletePackageImpl, {});
