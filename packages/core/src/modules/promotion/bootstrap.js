const { Cart } = require("../checkout/services/cart/Cart");
const { Item } = require("../checkout/services/cart/Item");
const { toPrice } = require("../checkout/services/toPrice");
const { Validator } = require("./services/couponValidator");
const { DiscountCalculator } = require("./services/discountCalculator");

module.exports = () => {
  /** Adding fields to the Cart object */
  const promotionFields = [
    {
      key: 'coupon',
      async resolver() {
        const coupon = this.dataSource['coupon'] ?? this.dataSource['coupon'] ?? null;
        if (coupon) {
          const validator = new Validator();
          const check = await validator.validate(this.dataSource['coupon'], this);
          if (check === true) {
            return coupon;
          } else {
            return null;
          }
        } else {
          return null;
        }
      },
      'dependencies': ['items'] // TODO: Add customer id and customer group id as a dependency
    },
    {
      key: 'discount_amount',
      async resolver() {
        const coupon = this.dataSource['coupon'] ?? this.dataSource['coupon'] ?? null;
        if (!coupon) {
          return 0;
        }
        // Start calculate discount amount
        let calculator = new DiscountCalculator(this);
        await calculator.calculate(this.getData('coupon'));
        let discountAmounts = calculator.getDiscounts();
        let discountAmount = 0;
        for (const id in discountAmounts) {
          // Set discount amount to cart items
          const item = this.getItem(id);
          await item.setData('discount_amount', discountAmounts[id]);
          discountAmount += discountAmounts[id];
        }

        return discountAmount;
      },
      'dependencies': ['coupon']
    }
  ]
  Cart.fields.push(...promotionFields);

  // Overwrite the 'grand_total' field
  Cart.fields.forEach((field) => {
    if (field.key === 'grand_total') {
      const prevResolver = field.resolver;
      field.resolver = async function resolver() {
        let prev = await prevResolver.call(this);
        return prev - this.getData('discount_amount');
      }
      field.dependencies = field.dependencies.concat(['discount_amount']);
    }
  });

  /** Adding fields to the Cart Item object */
  const itemPromotionFields = [
    {
      key: 'discount_amount',
      async resolver() {
        if (this.dataSource.discount_amount) {
          return toPrice(this.dataSource.discount_amount);
        } else {
          return 0;
        }
      },
      'dependencies': []
    }
  ]
  Item.fields.push(...itemPromotionFields);

  // Overwrite the 'total' field
  Item.fields.forEach((field) => {
    if (field.key === 'total') {
      const prevResolver = field.resolver;
      field.resolver = async function resolver() {
        let prev = await prevResolver.call(this);
        return prev - this.getData('discount_amount');
      }
      field.dependencies = field.dependencies.concat(['discount_amount']);
    }
  });
}