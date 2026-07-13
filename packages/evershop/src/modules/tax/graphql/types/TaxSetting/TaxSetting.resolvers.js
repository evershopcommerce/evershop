import { getPriceIncludingTax } from '../../../services/taxSettings.js';

export default {
  Setting: {
    priceIncludingTax: () => getPriceIncludingTax()
  }
};
