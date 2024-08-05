const config = require('config');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultProductCollectionFilters = require('./services/registerDefaultProductCollectionFilters');
const registerDefaultCategoryCollectionFilters = require('./services/registerDefaultCategoryCollectionFilters');
const registerDefaultCollectionCollectionFilters = require('./services/registerDefaultCollectionCollectionFilters');
const registerDefaultAttributeCollectionFilters = require('./services/registerDefaultAttributeCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const {
  registerCartItemProductUrlField
} = require('./services/registerCartItemProductUrlField');
const {
  registerCartItemVariantOptionsField
} = require('./services/registerCartItemVariantOptionsField');

module.exports = () => {
  addProcessor('cartItemFields', registerCartItemProductUrlField, 0);
  addProcessor('cartItemFields', registerCartItemVariantOptionsField, 0);
  addProcessor('configuratonSchema', (schema) => {
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
                    thumbnail: {
                      type: 'object',
                      properties: {
                        width: {
                          type: 'integer'
                        },
                        height: {
                          type: 'integer'
                        }
                      }
                    },
                    listing: {
                      type: 'object',
                      properties: {
                        width: {
                          type: 'integer'
                        },
                        height: {
                          type: 'integer'
                        }
                      }
                    },
                    single: {
                      type: 'object',
                      properties: {
                        width: {
                          type: 'integer'
                        },
                        height: {
                          type: 'integer'
                        }
                      }
                    },
                    placeHolder: {
                      type: 'string',
                      format: 'uri-reference'
                    }
                  }
                }
              }
            },
            showOutOfStockProduct: {
              type: 'boolean'
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
        thumbnail: {
          width: 100.6,
          height: 100.5
        },
        listing: {
          width: 300.5,
          height: 300.5
        },
        single: {
          width: 500,
          height: 500
        },
        placeHolder: '/default/image/placeholder.png'
      }
    },
    showOutOfStockProduct: false
  };
  config.util.setModuleDefaults('catalog', defaultCatalogConfig);

  // Default pricing configuration
  const defaultPricingConfig = {
    rounding: 'round',
    precision: 2
  };
  config.util.setModuleDefaults('pricing', defaultPricingConfig);
  // Getting config value like this: config.get('catalog.product.image.thumbnail.width');

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
};
