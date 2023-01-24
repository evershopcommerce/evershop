const { Cart } = require('../checkout/services/cart/Cart');

module.exports = () => {
  Cart.addField('customer_id', function resolver() {
    return this.dataSource?.customer_id ?? null;
  });

  Cart.addField('customer_group_id', function resolver() {
    return this.dataSource?.customer_group_id ?? null;
  });

  Cart.addField('customer_email', function resolver() {
    return this.dataSource?.customer_email ?? null;
  });

  Cart.addField('customer_full_name', function resolver() {
    return this.dataSource?.customer_full_name ?? null;
  });
};
