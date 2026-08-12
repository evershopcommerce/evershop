import { toBoolean, toInt } from '../../../lib/util/coerce.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSettingSync } from '../../setting/services/setting.js';

/**
 * Catalog behaviour settings. Each getter reads the admin `setting` row first, falling back to
 * the legacy `catalog.*` config value, then the hard default — the same DB → config → default
 * shape as `getStoreCurrency` (`modules/setting/services/setting.ts`). All are SYNCHRONOUS
 * (cache-only) so they are safe in hot/sync paths (pagination filter, SSR context builder).
 * Values are coerced because the `setting` table returns scalars as strings.
 */

export function getShowOutOfStockProducts(): boolean {
  return toBoolean(
    getSettingSync<unknown>(
      'catalogShowOutOfStockProduct',
      getConfig('catalog.showOutOfStockProduct', false)
    )
  );
}

export function getCollectionPageSize(): number {
  return Math.max(
    1,
    toInt(
      getSettingSync<unknown>(
        'catalogCollectionPageSize',
        getConfig('catalog.collectionPageSize', 20)
      ),
      20
    )
  );
}

export function getProductImageDimensions(): { width: number; height: number } {
  return {
    width: toInt(
      getSettingSync<unknown>(
        'catalogProductImageWidth',
        getConfig('catalog.product.image.width', 1200)
      ),
      1200
    ),
    height: toInt(
      getSettingSync<unknown>(
        'catalogProductImageHeight',
        getConfig('catalog.product.image.height', 1200)
      ),
      1200
    )
  };
}
