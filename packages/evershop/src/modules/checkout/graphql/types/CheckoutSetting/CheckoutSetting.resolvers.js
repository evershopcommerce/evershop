const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Setting: {
    showShippingNote: () => getConfig('checkout.showShippingNote', true)
  }
};
