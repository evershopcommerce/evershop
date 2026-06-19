import path from 'path';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { validateMetafields } from '../../lib/metafield/index.js';
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

// Fold an entity's submitted `metafields` into its `meta_data` column on save.
// Runs only when `metafields` is explicitly provided (the edit form sends it),
// so plain API updates that omit it leave `meta_data` untouched.
function makeMetafieldFolder(ownerType) {
  return async function foldMetafields(data) {
    if (data && data.metafields !== undefined) {
      data.meta_data = await validateMetafields(ownerType, data.metafields);
    }
    return data;
  };
}

export default () => {
  const foldProductMetafields = makeMetafieldFolder('product');
  addProcessor('productDataBeforeCreate', foldProductMetafields);
  addProcessor('productDataBeforeUpdate', foldProductMetafields);
  const foldCategoryMetafields = makeMetafieldFolder('category');
  addProcessor('categoryDataBeforeCreate', foldCategoryMetafields);
  addProcessor('categoryDataBeforeUpdate', foldCategoryMetafields);
  const foldCollectionMetafields = makeMetafieldFolder('collection');
  addProcessor('collectionDataBeforeCreate', foldCollectionMetafields);
  addProcessor('collectionDataBeforeUpdate', foldCollectionMetafields);
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
    category: 'commerce',
    icon: 'Package',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionProductsSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionProducts.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionProductsPreview.js'
    ),
    defaultSettings: {
      collection: null,
      count: 4,
      countPerRow: 4,
      heading: null,
      subText: null,
      viewAllLink: null,
      viewAllLabel: null
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        collection: { type: ['string', 'null'] },
        count: { type: 'integer', minimum: 1, maximum: 48 },
        countPerRow: { type: 'integer', enum: [1, 2, 3, 4, 6] },
        heading: { type: ['string', 'null'] },
        subText: { type: ['string', 'null'] },
        viewAllLink: { type: ['string', 'null'] },
        viewAllLabel: { type: ['string', 'null'] }
      }
    },
    graphql: {
      typeDefs: `
        type CollectionProductsSettings {
          collection: ID
          count: Int
          countPerRow: Int
          heading: String
          subText: String
          viewAllLink: String
          viewAllLabel: String
        }
      `,
      settingsType: 'CollectionProductsSettings'
    }
  });

  registerWidget({
    type: 'collection_stack',
    name: 'Collection stack',
    description:
      'Stacked rows of collections, each with a heading, view-all link, and a strip of products.',
    category: 'commerce',
    icon: 'Rows3',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionStackSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionStack.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionStackPreview.js'
    ),
    defaultSettings: {
      collections: [],
      productCount: 4,
      showPrice: true,
      divider: true
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        collections: { type: 'array', items: { type: 'object' } },
        productCount: { type: 'integer', enum: [2, 3, 4] },
        showPrice: { type: ['boolean', 'null'] },
        divider: { type: ['boolean', 'null'] }
      }
    },
    graphql: {
      typeDefs: `
        type CollectionStackSettings {
          collections: JSON
          productCount: Int
          showPrice: Boolean
          divider: Boolean
        }
      `,
      settingsType: 'CollectionStackSettings'
    }
  });

  registerWidget({
    type: 'collection_spotlight',
    name: 'Collection spotlight',
    description:
      'A featured collection with cover image, editorial copy, and a small product preview grid.',
    category: 'commerce',
    icon: 'Star',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionSpotlightSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionSpotlight.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/CollectionSpotlightPreview.js'
    ),
    defaultSettings: {
      collection: null,
      image: null,
      imageAlt: '',
      imagePosition: 'left',
      imageWidth: null,
      imageHeight: null,
      eyebrow: 'COLLECTION',
      heading: '',
      body: null,
      previewCount: 4
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        collection: { type: ['string', 'null'] },
        image: { type: ['string', 'null'] },
        imageAlt: { type: ['string', 'null'] },
        imagePosition: { type: 'string', enum: ['left', 'right'] },
        imageWidth: { type: ['integer', 'null'] },
        imageHeight: { type: ['integer', 'null'] },
        eyebrow: { type: ['string', 'null'] },
        heading: { type: ['string', 'null'] },
        body: { type: ['string', 'null'] },
        previewCount: { type: 'integer', enum: [2, 4] }
      }
    },
    graphql: {
      typeDefs: `
        type CollectionSpotlightSettings {
          collection: String
          image: String
          imageAlt: String
          imagePosition: String
          imageWidth: Float
          imageHeight: Float
          eyebrow: String
          heading: String
          body: String
          previewCount: Int
        }
      `,
      settingsType: 'CollectionSpotlightSettings'
    }
  });

  registerWidget({
    type: 'product_hero',
    name: 'Product hero',
    description:
      'A single-product spotlight — image, name, price, and a link to the full product page.',
    category: 'commerce',
    icon: 'Sparkles',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/ProductHeroSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/ProductHero.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'catalog/components/ProductHeroPreview.js'
    ),
    defaultSettings: {
      productUuid: null,
      image: null,
      imageAlt: '',
      imageWidth: null,
      imageHeight: null,
      eyebrow: 'FEATURED',
      copy: null,
      imagePosition: 'left'
    },
    enabled: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        productUuid: { type: ['string', 'null'] },
        image: { type: ['string', 'null'] },
        imageAlt: { type: ['string', 'null'] },
        imageWidth: { type: ['integer', 'null'] },
        imageHeight: { type: ['integer', 'null'] },
        eyebrow: { type: ['string', 'null'] },
        copy: { type: ['string', 'null'] },
        imagePosition: { type: 'string', enum: ['left', 'right'] }
      }
    },
    graphql: {
      typeDefs: `
        type ProductHeroSettings {
          productUuid: String
          image: String
          imageAlt: String
          imageWidth: Float
          imageHeight: Float
          eyebrow: String
          copy: String
          imagePosition: String
        }
      `,
      settingsType: 'ProductHeroSettings'
    }
  });
};
