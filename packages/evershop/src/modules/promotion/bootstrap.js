const { Cart } = require('../checkout/services/cart/Cart');
const { Item } = require('../checkout/services/cart/Item');
const { toPrice } = require('../checkout/services/toPrice');
const { Validator } = require('./services/CouponValidator');
const { DiscountCalculator } = require('./services/DiscountCalculator');

module.exports = () => {
  /** Adding fields to the Cart object */
  [
    {
      key: 'coupon',
      resolvers: [
        async function resolver() {
          const coupon =
            this.dataSource.coupon ?? this.dataSource.coupon ?? null;
          if (coupon) {
            const validator = new Validator();
            const check = await validator.validate(
              this.dataSource.coupon,
              this
            );
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
          if (!coupon) {
            const items = this.getItems();
            // eslint-disable-next-line no-restricted-syntax
            for (const item of items) {
              // eslint-disable-next-line no-await-in-loop
              await item.setData('discount_amount', 0);
            }
            return 0;
          }
          // Start calculate discount amount
          const calculator = new DiscountCalculator(this);
          await calculator.calculate(coupon);
          const discountAmounts = calculator.getDiscounts();
          let discountAmount = 0;
          // eslint-disable-next-line guard-for-in
          // eslint-disable-next-line no-restricted-syntax
          for (const id in discountAmounts) {
            if (id in discountAmounts) {
              // Set discount amount to cart items
              const item = this.getItem(id);
              // eslint-disable-next-line no-await-in-loop
              await item.setData('discount_amount', discountAmounts[id]);
              discountAmount += discountAmounts[id];
            }
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
  ].forEach((field) => {
    Cart.addField(field.key, field.resolvers, field.dependencies);
  });

  /** Adding fields to the Cart Item object */
  [
    {
      key: 'discount_amount',
      resolvers: [
        async function resolver() {
          if (this.dataSource.discount_amount) {
            return toPrice(this.dataSource.discount_amount);
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
  ].forEach((field) => {
    Item.addField(field.key, field.resolvers, field.dependencies);
  });
};
