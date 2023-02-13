const { Cart } = require('../checkout/services/cart/Cart');
const { getSetting } = require('../setting/services/setting');

module.exports = () => {
  Cart.addField('payment_method', async function resolver(previousValue) {
    const paymentMethod = this.dataSource?.payment_method ?? null;
    if (paymentMethod !== 'cod') {
      return previousValue;
    } else {
      // Validate the payment method
      const codStatus = await getSetting('codPaymentStatus');
      if (parseInt(codStatus, 10) !== 1) {
        return previousValue;
      } else {
        delete this.errors.payment_method;
        return paymentMethod;
      }
    }
  });
};
