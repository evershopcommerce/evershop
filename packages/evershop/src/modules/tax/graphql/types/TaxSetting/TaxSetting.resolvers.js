import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export default {
  Setting: {
    priceIncludingTax: () => getConfig('pricing.tax.price_including_tax', false)
  }
};
