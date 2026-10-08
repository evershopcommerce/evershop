import { warning } from '../../../lib/log/logger.js';
import { pool as appPool } from '../../../lib/postgres/connection.js';
import { PoolLike } from './recommendation/applyRecommendationGating.js';

/** The path the all-products listing route is registered at. */
export const PRODUCT_LISTING_PATH = '/products';

/**
 * Warn when the all-products route shadows an entity that already owns
 * `/products`.
 *
 * Going forward nothing can take the slug — `assertUrlKeyAvailable` reads the
 * live route table, so a CMS or landing page created after this route exists is
 * rejected. But a store that already had one gets no such protection: the route
 * matcher runs before the `url_rewrite` fallback, so on upgrade that page simply
 * stops resolving. Silently. This at least names it in the boot log so the
 * merchant can rename their page.
 *
 * Deliberately non-fatal and deliberately swallowing errors: bootstrap (phase 4)
 * runs BEFORE migrate (phase 7), so on a first boot `url_rewrite` may not exist
 * yet — and on a first boot there is nothing to collide with anyway. A warning
 * must never be the reason a store fails to start.
 *
 * `pool` and `log` are injectable so this can be tested without a database.
 */
export async function warnOnProductListingPathConflict(
  pool: PoolLike = appPool as unknown as PoolLike,
  log: (message: string) => void = warning
): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `SELECT entity_type, entity_uuid FROM url_rewrite
       WHERE request_path = $1 LIMIT 1`,
      [PRODUCT_LISTING_PATH]
    );
    if (rows.length === 0) {
      return false;
    }
    const { entity_type: entityType, entity_uuid: entityUuid } = rows[0];
    log(
      `The all-products page is registered at ${PRODUCT_LISTING_PATH}, which is ` +
        `already used by an existing ${entityType ?? 'entity'} (${
          entityUuid ?? 'unknown uuid'
        }). Routes match before URL rewrites, so that page is no longer ` +
        `reachable at ${PRODUCT_LISTING_PATH} — change its url_key to restore it.`
    );
    return true;
  } catch {
    // Table missing (first boot, pre-migration) or the DB is not up yet.
    return false;
  }
}
