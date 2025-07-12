import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Weight: {
    value: (raw) => parseFloat(raw),
    unit: () => {
      const unit = getConfig('shop.weightUnit', 'kg');
      return unit;
    },
    text: (raw) => {
      const weight = parseFloat(raw);
      const unit = getConfig('shop.weightUnit', 'kg');
      // Localize the weight
      return `${weight} ${unit}`;
    }
  }
};
