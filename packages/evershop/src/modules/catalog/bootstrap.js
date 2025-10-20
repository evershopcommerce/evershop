import path from 'path';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import { registerCartItemProductUrlField } from './services/registerCartItemProductUrlField.js';
import { registerCartItemVariantOptionsField } from './services/registerCartItemVariantOptionsField.js';
import registerDefaultAttributeCollectionFilters from './services/registerDefaultAttributeCollectionFilters.js';
import registerDefaultCategoryCollectionFilters from './services/registerDefaultCategoryCollectionFilters.js';
import registerDefaultCollectionCollectionFilters from './services/registerDefaultCollectionCollectionFilters.js';
import registerDefaultProductCollectionFilters from './services/registerDefaultProductCollectionFilters.js';

export default () => {
  addProcessor('cartItemFields', registerCartItemProductUrlField, 0);
  addProcessor('cartItemFields', registerCartItemVariantOptionsField, 0);
  addProcessor('configurationSchema', (schema) => {
    merge(schema, {
      properties: {
        catalog: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              properties: {
                image: {
                  type: 'object',
                  properties: {
                    width: {
                      type: 'integer'
                    },
                    height: {
                      type: 'integer'
                    }
                  }
                }
              }
            },
            showOutOfStockProduct: {
              type: 'boolean'
            },
            collectionPageSize: {
              type: 'integer',
              minimum: 1
            }
          }
        },
        pricing: {
          type: 'object',
          properties: {
            rounding: {
              type: 'string',
              enum: ['round', 'floor', 'ceil']
            },
            precision: {
              type: 'integer'
            }
          }
        }
      }
    });
    return schema;
  });
  const defaultCatalogConfig = {
    product: {
      image: {
        width: 1200,
        height: 1200
      }
    },
    showOutOfStockProduct: false,
    collectionPageSize: 20
  };
  config.util.setModuleDefaults('catalog', defaultCatalogConfig);

  // Default pricing configuration
  const defaultPricingConfig = {
    rounding: 'round',
    precision: 2
  };
  config.util.setModuleDefaults('pricing', defaultPricingConfig);

  // Reigtering the default filters for product collection
  addProcessor(
    'productCollectionFilters',
    registerDefaultProductCollectionFilters,
    1
  );
  addProcessor(
    'productCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for category collection
  addProcessor(
    'categoryCollectionFilters',
    registerDefaultCategoryCollectionFilters,
    1
  );
  addProcessor(
    'categoryCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for collection collection
  addProcessor(
    'collectionCollectionFilters',
    registerDefaultCollectionCollectionFilters,
    1
  );
  addProcessor(
    'collectionCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for attribute collection
  addProcessor(
    'attributeCollectionFilters',
    registerDefaultAttributeCollectionFilters,
    1
  );
  addProcessor(
    'attributeCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for attribute group collection
  addProcessor(
    'attributeGroupCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    1
  );

  registerWidget({
    type: 'collection_products',
    name: 'Collection products',
    description: 'A list of products from a collection',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionProductsSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionProducts.js'
    ),
    defaultSettings: {
      collection: null,
      count: 4,
      countPerRow: 4
    },
    enabled: true
  });
};
