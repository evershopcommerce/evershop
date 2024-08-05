process.env.ALLOW_CONFIG_MUTATIONS = true;
const {
  addProcessor,
  addFinalProcessor
} = require('@evershop/evershop/src/lib/util/registry');
const {
  registerCartBaseFields
} = require('../services/cart/registerCartBaseFields');
const {
  registerCartItemBaseFields
} = require('../services/cart/registerCartItemBaseFields');
const { sortFields } = require('../services/cart/sortFields');
const { products } = require('./products');
const { taxRates } = require('./taxRates');
const {
  registerCartPromotionFields
} = require('../../promotion/services/registerCartPromotionFields');
const {
  registerCartItemPromotionFields
} = require('../../promotion/services/registerCartItemPromotionFields');
const { coupons } = require('./coupons');
const {
  registerDefaultValidators
} = require('../../promotion/services/registerDefaultValidators');
const {
  registerDefaultCalculators
} = require('../../promotion/services/registerDefaultCalculators');

// Default tax configuration
addProcessor('cartFields', registerCartBaseFields, 0);
addProcessor('cartFields', registerCartPromotionFields, 0);
addProcessor('cartItemFields', registerCartItemBaseFields, 0);
addProcessor('cartItemFields', registerCartItemPromotionFields, 0);
addProcessor(
  'cartItemFields',
  (fields) => {
    fields.push({
      key: 'tax_percent',
      resolvers: [
        function resolver() {
          const classId = this.getData('tax_class_id');
          return taxRates[classId] || 0;
        }
      ],
      dependencies: ['tax_class_id']
    });
    return fields;
  },
  0
);

addFinalProcessor('cartFields', (fields) => {
  try {
    const sortedFields = sortFields(fields);
    return sortedFields;
  } catch (e) {
    error(e);
    throw e;
  }
});

addFinalProcessor('cartItemFields', (fields) => {
  try {
    const sortedFields = sortFields(fields);
    return sortedFields;
  } catch (e) {
    error(e);
    throw e;
  }
});

addProcessor('cartItemProductLoaderFunction', () => {
  return (id) => {
    return products.find((product) => product.product_id === id);
  };
});

addProcessor('couponLoaderFunction', () => {
  return (code) => {
    return coupons.find((coupon) => coupon.coupon === code);
  };
});

addProcessor('couponValidatorFunctions', registerDefaultValidators);
addProcessor('discountCalculatorFunctions', registerDefaultCalculators);
