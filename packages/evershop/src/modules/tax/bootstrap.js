const config = require('config');

module.exports = () => {
  // Pricing configuration
  const pricingConfig = {
    tax: {
      rounding: 'round',
      precision: 2,
      round_level: 'total',
      display_catalog_price_including_tax: true,
      display_checkout_price_including_tax: true
    }
  };
  config.util.setModuleDefaults('pricing', pricingConfig);
  // Getting config value like this: config.get('pricing.tax.rounding');
};
