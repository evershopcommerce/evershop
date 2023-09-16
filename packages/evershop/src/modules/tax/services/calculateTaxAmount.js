const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports.calculateTaxAmount = function calculateTaxAmount(
  taxPercentage,
  price,
  quantity
) {
  const rounding = getConfig('pricing.tax.rounding', 'round');
  const roundingLevel = getConfig('pricing.tax.round_level', 'unit');
  const precision = getConfig('pricing.tax.precision', '2');
  const precisionFix = parseInt(`1${'0'.repeat(precision)}`, 10);

  // Calculate the total price before tax
  const totalPrice = price * quantity;

  if (roundingLevel === 'unit') {
    // Calculate the tax amount
    const taxAmountUnit = (price * taxPercentage) / 100;
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
    return taxAmount * quantity;
  } else {
    // Calculate the tax amount
    let taxAmount = (totalPrice * taxPercentage) / 100;
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
  }
};
