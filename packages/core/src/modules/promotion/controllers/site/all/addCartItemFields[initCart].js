const { Item } = require('../../../../checkout/services/cart/item');

module.exports = (request, response, stack, next) => {
  const promotionFields = [
    {
      key: 'discount_amount',
      async resolver() {
        if (this.dataSource.cart_id) {
          const cart = await select()
            .from('cart')
            .where('cart_id', '=', this.dataSource.cart_id)
            .load(pool);
          if (!cart || cart.status === 0) {
            this._error = 'Cart does not exist';
            this.dataSource = {};
            return null;
          } else {
            return cart.cart_id;
          }
        } else {
          return undefined;
        }
      },
      'dependencies': ['coupon']
    }
  ]
  Item.fields.push(...promotionFields);

  // Overwrite the 'total' field
  Item.fields.forEach((field) => {
    if (field.key === 'total') {
      const prevResolver = field.resolver;
      field.resolver = async (item) => {
        let prev = await prevResolver(item);
        return prev - item.getData('discount_amount');
      }
      field.dependencies = field.dependencies.concat(['discount_amount']);
    }
  });

  next();
};
