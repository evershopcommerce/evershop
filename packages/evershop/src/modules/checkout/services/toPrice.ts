import { getConfig } from '../../../lib/util/getConfig.js';
import { getStoreCurrency } from '../../setting/services/setting.js';
import { getPriceRounding, getPricePrecision } from './pricingSettings.js';

// `round` (nearest, default), `ceil` (always up) and `floor` (always down) are
// the values accepted by the `pricing.rounding` config schema. `up`/`down` are
// kept as backward-compatible aliases for `ceil`/`floor`.
export type RoundType = 'round' | 'ceil' | 'floor' | 'up' | 'down';
export function toPrice(value: string, forDisplay: boolean = false) {
  let price = parseFloat(value || '0');
  if (Number.isNaN(price)) {
    throw new Error('Price is not a number');
  }
  const rounding = getPriceRounding();
  const precision = getPricePrecision();
  const precisionFix = 10 ** precision;
  switch (rounding) {
    case 'ceil':
    case 'up':
      price = Math.ceil(price * precisionFix) / precisionFix;
      break;
    case 'floor':
    case 'down':
      price = Math.floor(price * precisionFix) / precisionFix;
      break;
    case 'round':
    default:
      price = Math.round(price * precisionFix) / precisionFix;
      break;
  }
  if (!forDisplay) {
    return price;
  } else {
    const currency = getStoreCurrency();
    const language = getConfig('shop.language', 'en');
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency
    }).format(price);
  }
}
