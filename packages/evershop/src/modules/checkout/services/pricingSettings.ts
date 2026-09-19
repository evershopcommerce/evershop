import { toEnum, toInt } from '../../../lib/util/coerce.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSettingSync } from '../../setting/services/setting.js';
import type { RoundType } from './toPrice.js';

/**
 * General price-rounding settings (apply to every monetary value via `toPrice`). Admin `setting`
 * first, then the legacy `pricing.*` config, then the default. Synchronous/cache-only so it is
 * safe inside `toPrice` and the promotion calculators. See `getStoreCurrency`
 * (`modules/setting/services/setting.ts`) for the DB → config → default pattern.
 */

// `round | ceil | floor` are the admin/schema values; `up`/`down` are accepted as legacy
// aliases so any pre-existing config value still flows through `toPrice`'s switch unchanged.
const ROUNDING_MODES: readonly RoundType[] = [
  'round',
  'ceil',
  'floor',
  'up',
  'down'
];

export function getPriceRounding(): RoundType {
  return toEnum(
    getSettingSync<unknown>('pricingRounding', getConfig('pricing.rounding', 'round')),
    ROUNDING_MODES,
    'round'
  );
}

export function getPricePrecision(): number {
  return toInt(
    getSettingSync<unknown>('pricingPrecision', getConfig('pricing.precision', 2)),
    2
  );
}
