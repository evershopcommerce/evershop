const { Cart } = require('../checkout/services/cart/Cart');
const { getSetting } = require('../setting/services/setting');

module.exports = () => {
  Cart.addField('payment_method', async function resolver(previousValue) {
    const paymentMethod = this.dataSource?.payment_method ?? null;
    if (paymentMethod !== 'paypal') {
      return previousValue;
    } else {
      // Validate the payment method
      const paypalStatus = await getSetting('paypalPaymentStatus');
      if (parseInt(paypalStatus, 10) !== 1) {
        return previousValue;
      } else {
        delete this.errors.payment_method;
        return paymentMethod;
      }
    }
  });
};
