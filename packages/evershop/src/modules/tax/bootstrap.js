import config from 'config';
import { merge } from '@evershop/evershop/src/lib/util/merge.js';
import { addProcessor } from '@evershop/evershop/src/lib/util/registry.js';
import { defaultPaginationFilters } from '@evershop/evershop/src/lib/util/defaultPaginationFilters.js';
import { registerDefaultTaxClassCollectionFilters } from './services/registerDefaultTaxClassCollectionFilters.js';
import { registerCartItemTaxPercentField } from './services/registerCartItemTaxPercentField.js';

export default () => {
  addProcessor('cartItemFields', registerCartItemTaxPercentField, 0);
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
                  enum: ['total', 'line', 'unit']
                },
                price_including_tax: {
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
      price_including_tax: true
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
