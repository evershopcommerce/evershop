import { toBoolean, toEnum, toInt } from '../../../lib/util/coerce.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSettingSync } from '../../setting/services/setting.js';

/**
 * Tax-calculation settings. Admin `setting` first, then the legacy `pricing.tax.*` config, then
 * the default. All SYNCHRONOUS (cache-only) so they are safe inside `calculateTaxAmount` and the
 * cart/promotion field resolvers. See `getStoreCurrency` (`modules/setting/services/setting.ts`)
 * for the DB → config → default pattern; values are coerced because settings come back as strings.
 *
 * NOTE on defaults: the fallbacks below match the *inline* `getConfig(...)` fallbacks the runtime
 * used before this change (`round_level: 'unit'`, `price_including_tax: false`), NOT the tax
 * bootstrap module defaults (`'total'` / `true`). In a running app the bootstrap defaults still
 * win (they populate `config`, so `getConfig` returns them); these inline fallbacks only surface
 * when neither a DB setting, a config value, nor a bootstrap ran (e.g. DB-less unit tests) — so
 * keeping them preserves the previous behaviour exactly.
 */

const ROUNDING_MODES = ['round', 'ceil', 'floor', 'up', 'down'] as const;
const ROUND_LEVELS = ['total', 'line', 'unit'] as const;

export function getTaxRounding(): (typeof ROUNDING_MODES)[number] {
  return toEnum(
    getSettingSync<unknown>('taxRounding', getConfig('pricing.tax.rounding', 'round')),
    ROUNDING_MODES,
    'round'
  );
}

export function getTaxPrecision(): number {
  return toInt(
    getSettingSync<unknown>('taxPrecision', getConfig('pricing.tax.precision', 2)),
    2
  );
}

export function getTaxRoundLevel(): (typeof ROUND_LEVELS)[number] {
  return toEnum(
    getSettingSync<unknown>('taxRoundLevel', getConfig('pricing.tax.round_level', 'unit')),
    ROUND_LEVELS,
    'unit'
  );
}

export function getPriceIncludingTax(): boolean {
  return toBoolean(
    getSettingSync<unknown>(
      'priceIncludingTax',
      getConfig('pricing.tax.price_including_tax', false)
    )
  );
}
