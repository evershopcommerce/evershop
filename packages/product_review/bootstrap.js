const config = require('config');

module.exports = () => {
  // Default configuration
  const checkoutConfig = {
      name: 'Shipped',
      badge: 'success',
      progress: 'complete'
    };
  config.util.setModuleDefaults('checkout.order.shipmentStatus.shipped', checkoutConfig);
};
