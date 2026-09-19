import { getWeightUnit } from '../../../../setting/services/setting.js';

export default {
  Weight: {
    value: (raw) => parseFloat(raw),
    unit: () => getWeightUnit(),
    text: (raw) => {
      const weight = parseFloat(raw);
      const unit = getWeightUnit();
      // Localize the weight
      return `${weight} ${unit}`;
    }
  }
};
