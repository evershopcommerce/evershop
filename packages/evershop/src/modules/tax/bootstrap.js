const config = require('config');

module.exports = () => {
  // Pricing configuration
  const pricingConfig = {
    tax: {
      rounding: 'round',
      precision: 2,
      round_level: 'unit'
    }
  };
  config.util.setModuleDefaults('pricing', pricingConfig);
  // Getting config value like this: config.get('pricing.tax.rounding');
};
