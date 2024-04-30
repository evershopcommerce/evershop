const config = require('config');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultTaxClassCollectionFilters = require('./services/registerDefaultTaxClassCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');

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

  // Reigtering the default filters for tax class collection
  addProcessor(
    'taxClassCollectionFilters',
    registerDefaultTaxClassCollectionFilters,
    1
  );
  addProcessor(
    'taxClassCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );
};
