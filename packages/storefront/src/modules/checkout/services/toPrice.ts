import { getConfig } from '../../../lib/util/getConfig.js';

export type RoundType = 'up' | 'down' | 'round';
export function toPrice(value: string, forDisplay: boolean = false) {
  let price = parseFloat(value || '0');
  if (Number.isNaN(price)) {
    throw new Error('Price is not a number');
  }
  const rounding = getConfig('pricing.rounding', 'round') as RoundType;
  const precision = getConfig('pricing.precision', 2);
  const precisionFix = 10 ** precision;
  switch (rounding) {
    case 'up':
      price = Math.ceil(price * precisionFix) / precisionFix;
      break;
    case 'down':
      price = Math.floor(price * precisionFix) / precisionFix;
      break;
    case 'round':
      price = Math.round(price * precisionFix) / precisionFix;
      break;
    default:
      price = Math.round(price * precisionFix) / precisionFix;
      break;
  }
  if (!forDisplay) {
    return price;
  } else {
    const currency = getConfig('shop.currency', 'USD');
    const language = getConfig('shop.language', 'en');
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency
    }).format(price);
  }
}
