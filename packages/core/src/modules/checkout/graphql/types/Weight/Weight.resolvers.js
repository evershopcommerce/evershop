const { getConfig } = require('../../../../../lib/util/getConfig');

module.exports = {
  Weight: {
    value: (raw) => {
      return parseFloat(raw);// TODO: Format for decimal value?
    },
    unit: () => {
      return getConfig('shop.weightUnit', 'kg');
    },
    text: (raw) => {
      const weight = parseFloat(raw);// TODO: Format for decimal value?
      const unit = getConfig('shop.weightUnit', 'kg');
      const language = getConfig('shop.language', 'en');
      // Localize the weight
      return new Intl.NumberFormat(language, { style: 'unit', unit }).format(weight);
    }
  }
}