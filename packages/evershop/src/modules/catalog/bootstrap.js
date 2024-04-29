const config = require('config');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultProductCollectionFilters = require('./services/registerDefaultProductCollectionFilters');
const registerDefaultCategoryCollectionFilters = require('./services/registerDefaultCategoryCollectionFilters');
const registerDefaultCollectionCollectionFilters = require('./services/registerDefaultCollectionCollectionFilters');
const registerDefaultAttributeCollectionFilters = require('./services/registerDefaultAttributeCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');

module.exports = () => {
  const catalogConfig = {
    product: {
      image: {
        thumbnail: {
          width: 100,
          height: 100
        },
        listing: {
          width: 300,
          height: 300
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
  config.util.setModuleDefaults('catalog', catalogConfig);

  // Pricing configuration
  const pricingConfig = {
    rounding: 'round',
    precision: 2
  };
  config.util.setModuleDefaults('pricing', pricingConfig);
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
