const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Setting: {
    priceIncludingTax: () => getConfig('pricing.tax.price_including_tax', false)
  }
};
