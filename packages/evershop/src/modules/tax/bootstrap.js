const config = require('config');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultTaxClassCollectionFilters = require('./services/registerDefaultTaxClassCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');

module.exports = () => {
  addProcessor('configuratonSchema', (schema) => {
    merge(schema, {
      properties: {
        pricing: {
          type: 'object',
          properties: {
            tax: {
              type: 'object',
              properties: {
                rounding: {
                  type: 'string',
                  enum: ['round', 'ceil', 'floor']
                },
                precision: {
                  type: 'integer'
                },
                round_level: {
                  type: 'string',
                  enum: ['total', 'unit']
                },
                display_catalog_price_including_tax: {
                  type: 'boolean'
                },
                display_checkout_price_including_tax: {
                  type: 'boolean'
                }
              }
            }
          }
        }
      }
    });
    return schema;
  });
  // Default tax configuration
  const defaultTaxConfig = {
    tax: {
      rounding: 'round',
      precision: 2,
      round_level: 'total',
      display_catalog_price_including_tax: true,
      display_checkout_price_including_tax: true
    }
  };
  config.util.setModuleDefaults('pricing', defaultTaxConfig);
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
