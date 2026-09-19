import {
  getDimensionUnit,
  getWeightUnit
} from '../../../services/setting.js';

export default {
  Setting: {
    allowedCountries: (setting) => {
      const allowedCountries = setting.find(
        (s) => s.name === 'allowedCountries'
      );
      if (allowedCountries && allowedCountries.value) {
        return JSON.parse(allowedCountries.value);
      } else {
        return ['US'];
      }
    },
    weightUnit: () => getWeightUnit(),
    dimensionUnit: () => getDimensionUnit()
  }
};
