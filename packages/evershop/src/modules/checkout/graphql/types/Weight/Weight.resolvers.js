const { getSetting } = require('../../../../setting/services/setting');

module.exports = {
  Weight: {
    value: (raw) => parseFloat(raw), // TODO: Format for decimal value?
    unit: async () => {
      const unit = await getSetting('weightUnit', 'kg');
      return unit;
    },
    text: async (raw) => {
      const weight = parseFloat(raw); // TODO: Format for decimal value?
      const unit = await getSetting('weightUnit', 'kg');
      const language = await getSetting('storeLanguage', 'en');
      // Localize the weight
      return new Intl.NumberFormat(language, { style: 'unit', unit }).format(
        weight
      );
    }
  }
};
