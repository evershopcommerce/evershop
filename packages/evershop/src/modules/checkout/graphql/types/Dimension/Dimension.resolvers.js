import { getDimensionUnit } from '../../../../setting/services/setting.js';

export default {
  Dimension: {
    value: (raw) => parseFloat(raw),
    unit: () => getDimensionUnit(),
    text: (raw) => {
      const value = parseFloat(raw);
      const unit = getDimensionUnit();
      return `${value} ${unit}`;
    }
  },
  // Parent is `{ length, width, height }` with raw numeric values; each field
  // hands its raw value to the Dimension type above for formatting.
  PackageDimensions: {
    length: ({ length }) => length,
    width: ({ width }) => width,
    height: ({ height }) => height
  }
};
