const { addressValidator } = require("../../../services/addressValidator");
const { getCustomerCart } = require("../../../services/getCustomerCart");

module.exports = {
  Query: {
    checkout: async () => {
      const cart = await getCustomerCart();
      if (!cart) {
        return null;
      } else {
        const steps = [
          {
            id: 'contact', title: 'Contact info', isCompleted: false, sortOrder: 5
          },
          {
            id: 'shipment', title: 'Shipping', isCompleted: false, sortOrder: 10
          },
          {
            id: 'payment', title: 'Payment', isCompleted: false, sortOrder: 15
          }
        ];

        if (cart.getData('customer_email')) {
          steps[0].isCompleted = true;
        }

        if (addressValidator(cart.getData('shippingAddress')) && cart.getData('shipping_method')) {
          steps[1].isCompleted = true;
        }

        return {
          steps
        };
      }
    }
  }
}
