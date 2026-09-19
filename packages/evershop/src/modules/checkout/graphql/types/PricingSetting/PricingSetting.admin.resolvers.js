import {
  getPricePrecision,
  getPriceRounding
} from '../../../services/pricingSettings.js';

// Admin-only pre-fill values for the general price-rounding card on the Pricing & Tax page.
export default {
  Setting: {
    pricingRounding: () => getPriceRounding(),
    pricingPrecision: () => getPricePrecision()
  }
};
