const { getConfig } = require("../../../lib/util/getConfig");

module.exports = exports = {};

exports.toPrice = function toPrice(value) {
  let price = parseFloat(value);
  if (isNaN(price)) {
    throw new Error("Price is not a number");
  }
  const rounding = getConfig('pricing.rounding', 'round');
  const precision = getConfig('pricing.precision', '2');
  const precisionFix = parseInt(`1${'0'.repeat(precision)}`, 10);
  switch (rounding) {
    case 'up':
      price = Math.ceil(price * precisionFix) / precisionFix;
      break;
    case 'down':
      price = Math.floor(price * precisionFix) / precisionFix;
      break;
    case 'round':
      price = Math.round(price * precisionFix) / precisionFix;
      break;
    default:
      price = Math.round(price * precisionFix) / precisionFix;
      break;
  }

  return price;
}
