const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('../../lib/postgres/connection');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const { addProcessor } = require('../../lib/util/registry');
const {
  registerCartItemPromotionFields
} = require('./services/registerCartItemPromotionFields');
const {
  registerCartPromotionFields
} = require('./services/registerCartPromotionFields');
const {
  registerDefaultCalculators
} = require('./services/registerDefaultCalculators');
const registerDefaultCouponCollectionFilters = require('./services/registerDefaultCouponCollectionFilters');
const {
  registerDefaultValidators
} = require('./services/registerDefaultValidators');

module.exports = () => {
  addProcessor(
    'couponLoaderFunction',
    () => async (couponCode) => {
        const coupon = await select()
          .from('coupon')
          .where('coupon', '=', couponCode)
          .load(pool);
        return coupon;
      },
    0
  );
  addProcessor('cartFields', registerCartPromotionFields, 0);
  addProcessor('cartItemFields', registerCartItemPromotionFields, 11);
  addProcessor('couponValidatorFunctions', registerDefaultValidators);
  addProcessor('discountCalculatorFunctions', registerDefaultCalculators);

  // Reigtering the default filters for attribute collection
  addProcessor(
    'couponCollectionFilters',
    registerDefaultCouponCollectionFilters,
    1
  );
  addProcessor(
    'couponCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );
};
