import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    priceIncludingTax: () => getConfig('pricing.tax.price_including_tax', false)
  }
};
