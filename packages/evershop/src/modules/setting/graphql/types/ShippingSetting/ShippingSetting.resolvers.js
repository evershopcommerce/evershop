import {
  getDimensionUnit,
  getWeightUnit
} from '../../../services/setting.js';

export default {
  Setting: {
    weightUnit: () => getWeightUnit(),
    dimensionUnit: () => getDimensionUnit()
  }
};
