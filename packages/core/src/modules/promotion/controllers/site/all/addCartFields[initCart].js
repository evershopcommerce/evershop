const { Cart } = require('../../../../checkout/services/cart/cart');
const { Validator } = require('../../../services/couponValidator');
const { DiscountCalculator } = require('../../../services/discountCalculator');

module.exports = (request, response, stack, next) => {
  const promotionFields = [
    {
      key: 'coupon',
      async resolver(cart) {
        const coupon = cart.dataSouce['coupon'] ?? cart.dataSouce['coupon'] ?? null;
        if (coupon) {
          const validator = new Validator();
          const check = await validator.validate(cart.dataSouce['coupon'], this);
          if (check === true) {
            return coupon;
          } else {
            return null;
          }
        } else {
          return null;
        }
      },
      'dependencies': ['customer_id', 'customer_group_id', 'items']
    },
    {
      key: 'discount_amount',
      async resolver(cart) {
        const coupon = cart.dataSouce['coupon'] ?? cart.dataSouce['coupon'] ?? null;
        if (!coupon) {
          return 0;
        }
        // Start calculate discount amount
        let calculator = new DiscountCalculator(this);
        await calculator.calculate(this.getData('coupon'));
        let discountAmounts = calculator.getDiscounts();
        let discountAmount = 0;
        for (const id in discountAmounts) {
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
      field.resolver = async function (cart) {
        let prev = await prevResolver(cart);
        return prev - cart.getData('discount_amount');
      }
      field.dependencies = field.dependencies.concat(['discount_amount']);
    }
  });

  next();
};
