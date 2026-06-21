import { select } from '@evershop/postgres-query-builder';
import { info, success } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { createPackage } from '../../modules/checkout/services/package/packageManager.js';
import type { PackageRow } from '../../modules/checkout/services/package/types.js';

/**
 * Name of the package this seeder owns. Kept distinct from the migration's
 * 'Standard Box' default so re-running the seed is idempotent (we match on this
 * name) and so the seed never disturbs the store's real default package.
 */
export const SEED_PACKAGE_NAME = 'Demo Sample Package';

/**
 * Ensure a sample package exists for the demo products to reference.
 *
 * Shippable products require a `package_id` — `createProduct` throws
 * "A package is required for shippable products" otherwise — so the product
 * seeder needs a package to point at. Idempotent: looks the package up by its
 * special name and only creates it when missing.
 */
export async function seedSamplePackage(): Promise<PackageRow> {
  info('Seeding sample package...');

  const existing = (await select()
    .from('package')
    .where('name', '=', SEED_PACKAGE_NAME)
    .load(pool)) as PackageRow | null;

  if (existing) {
    info(`Package "${SEED_PACKAGE_NAME}" already exists, skipping...`);
    return existing;
  }

  // is_default: false — the migration already seeds the default 'Standard Box';
  // products reference this one explicitly via package_id.
  const pkg = (await createPackage({
    name: SEED_PACKAGE_NAME,
    length: 30,
    width: 25,
    height: 10,
    weight: 0,
    is_default: false
  })) as PackageRow;

  success(`✓ Created package: ${SEED_PACKAGE_NAME}`);
  return pkg;
}
