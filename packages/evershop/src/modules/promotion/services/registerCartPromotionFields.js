const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { validateCoupon } = require('./couponValidator');
const { calculateDiscount } = require('./discountCalculator');
const { toPrice } = require('../../checkout/services/toPrice');

module.exports = exports = {};
module.exports.registerCartPromotionFields =
  function registerCartPromotionFields(fields) {
    const newFields = fields.concat(
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
          dependencies: ['coupon', 'sub_total', 'sub_total_incl_tax']
        },
        {
          key: 'tax_amount',
          resolvers: [
            async function resolver(previousValue) {
              return previousValue;
            }
          ],
          dependencies: ['discount_amount']
        },
        {
          key: 'sub_total_with_discount',
          resolvers: [
            async function resolver() {
              const priceIncludingTax = getConfig(
                'pricing.tax.price_including_tax',
                false
              );
              if (!priceIncludingTax) {
                return toPrice(
                  this.getData('sub_total') - this.getData('discount_amount')
                );
              } else {
                return toPrice(
                  this.getData('sub_total_incl_tax') -
                    this.getData('discount_amount') -
                    this.getData('tax_amount')
                );
              }
            }
          ],
          dependencies: [
            'sub_total',
            'sub_total_incl_tax',
            'discount_amount',
            'tax_amount'
          ]
        },
        {
          key: 'sub_total_with_discount_incl_tax',
          resolvers: [
            async function resolver() {
              return toPrice(
                this.getData('sub_total_with_discount') +
                  this.getData('tax_amount')
              );
            }
          ],
          dependencies: ['sub_total_with_discount', 'tax_amount']
        },
        {
          key: 'shipping_fee_excl_tax', // This is to make sure the shipping fee is calculated after the coupon validation
          resolvers: [],
          dependencies: ['coupon']
        },
        {
          key: 'grand_total',
          resolvers: [
            async function resolver() {
              return toPrice(
                this.getData('sub_total_with_discount_incl_tax') +
                  this.getData('shipping_fee_incl_tax')
              );
            }
          ],
          dependencies: [
            'sub_total_with_discount_incl_tax',
            'shipping_fee_incl_tax'
          ]
        }
      ]
    );
    return newFields;
  };
