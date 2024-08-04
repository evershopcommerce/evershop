const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports.calculateTaxAmount = function calculateTaxAmount(
  taxPercentage,
  price,
  quantity = 1,
  priceIncludingTax = false
) {
  const rounding = getConfig('pricing.tax.rounding', 'round');
  const roundingLevel = getConfig('pricing.tax.round_level', 'unit');
  const precision = getConfig('pricing.tax.precision', '2');
  const precisionFix = 10**precision;

  const taxAmountUnit =
    priceIncludingTax === false
      ? (price * taxPercentage) / 100
      : (price * taxPercentage) / (100 + taxPercentage);
  if (roundingLevel === 'unit') {
    // Calculate the tax amount
    let taxAmount = 0;
    switch (rounding) {
      case 'up':
        taxAmount = Math.ceil(taxAmountUnit * precisionFix) / precisionFix;
        break;
      case 'down':
        taxAmount = Math.floor(taxAmountUnit * precisionFix) / precisionFix;
        break;
      case 'round':
        taxAmount = Math.round(taxAmountUnit * precisionFix) / precisionFix;
        break;
      default:
        taxAmount = Math.round(taxAmountUnit * precisionFix) / precisionFix;
        break;
    }
    return Math.round(taxAmount * precisionFix * quantity) / precisionFix;
  } else if (roundingLevel === 'line') {
    // Calculate the tax amount
    let taxAmount = taxAmountUnit * quantity;
    switch (rounding) {
      case 'up':
        taxAmount = Math.ceil(taxAmount * precisionFix) / precisionFix;
        break;
      case 'down':
        taxAmount = Math.floor(taxAmount * precisionFix) / precisionFix;
        break;
      case 'round':
        taxAmount = Math.round(taxAmount * precisionFix) / precisionFix;
        break;
      default:
        taxAmount = Math.round(taxAmount * precisionFix) / precisionFix;
        break;
    }
    return taxAmount;
  } else {
    return taxAmountUnit * quantity; // Rounding will be done in the resolver of the total tax amount in the cart
  }
};
