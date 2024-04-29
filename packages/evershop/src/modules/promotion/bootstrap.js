const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const { addProcessor } = require('../../lib/util/registry');
const { toPrice } = require('../checkout/services/toPrice');
const { validateCoupon } = require('./services/couponValidator');
const { calculateDiscount } = require('./services/discountCalculator');
const {
  registerDefaultCalculators
} = require('./services/registerDefaultCalculators');
const registerDefaultCouponCollectionFilters = require('./services/registerDefaultCouponCollectionFilters');
const {
  registerDefaultValidators
} = require('./services/registerDefaultValidators');

module.exports = () => {
  addProcessor('cartFields', (fields) =>
    fields.concat(
      /** Adding fields to the Cart object */
      [
        {
          key: 'coupon',
          resolvers: [
            async function resolver(coupon) {
              if (coupon) {
                const check = await validateCoupon(this, coupon);
                if (check === true) {
                  return coupon;
                } else {
                  return null;
                }
              } else {
                return null;
              }
            }
          ],
          dependencies: ['items'] // TODO: Add customer id and customer group id as a dependency
        },
        {
          key: 'discount_amount',
          resolvers: [
            async function resolver() {
              const coupon = this.getData('coupon');
              const items = this.getItems();
              if (!coupon) {
                await Promise.all(
                  items.map(async (item) => {
                    item.setData('discount_amount', 0);
                  })
                );
                return 0;
              }
              // Start calculate discount amount
              await calculateDiscount(this, coupon);
              let discountAmount = 0;
              // eslint-disable-next-line no-restricted-syntax
              for (const item of items) {
                discountAmount += item.getData('discount_amount');
              }
              return discountAmount;
            }
          ],
          dependencies: ['coupon']
        },
        {
          key: 'grand_total',
          resolvers: [
            async function resolver(previousValue) {
              return previousValue - this.getData('discount_amount');
            }
          ],
          dependencies: ['discount_amount']
        },
        {
          key: 'shipping_fee_excl_tax', // This is to make sure the shipping fee is calculated after the coupon validation
          resolvers: [],
          dependencies: ['coupon']
        }
      ]
    )
  );

  addProcessor(
    'cartItemFields',
    (fields) =>
      fields.concat(
        /** Adding fields to the Cart Item object */
        [
          {
            key: 'discount_amount',
            resolvers: [
              async function resolver() {
                const requestedField = this.getTriggeredField();
                const requestedValue = this.getRequestedValue();
                if (requestedField === 'discount_amount') {
                  return toPrice(requestedValue);
                } else {
                  return 0;
                }
              }
            ]
          },
          {
            key: 'total',
            resolvers: [
              async function resolver(previousValue) {
                return previousValue - this.getData('discount_amount');
              }
            ],
            dependencies: ['discount_amount']
          }
        ]
      ),
    11
  );

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
