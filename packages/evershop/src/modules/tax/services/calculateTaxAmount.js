import {
  getTaxPrecision,
  getTaxRounding,
  getTaxRoundLevel
} from './taxSettings.js';

export function calculateTaxAmount(
  taxPercentage,
  price,
  quantity = 1,
  priceIncludingTax = false
) {
  const rounding = getTaxRounding();
  const roundingLevel = getTaxRoundLevel();
  const precision = getTaxPrecision();
  const precisionFix = 10 ** precision;

  const taxAmountUnit =
    priceIncludingTax === false
      ? (price * taxPercentage) / 100
      : (price * taxPercentage) / (100 + taxPercentage);
  if (roundingLevel === 'unit') {
    // Calculate the tax amount
    let taxAmount = 0;
    switch (rounding) {
      case 'ceil':
      case 'up':
        taxAmount = Math.ceil(taxAmountUnit * precisionFix) / precisionFix;
        break;
      case 'floor':
      case 'down':
        taxAmount = Math.floor(taxAmountUnit * precisionFix) / precisionFix;
        break;
      case 'round':
      default:
        taxAmount = Math.round(taxAmountUnit * precisionFix) / precisionFix;
        break;
    }
    return Math.round(taxAmount * precisionFix * quantity) / precisionFix;
  } else if (roundingLevel === 'line') {
    // Calculate the tax amount
    let taxAmount = taxAmountUnit * quantity;
    switch (rounding) {
      case 'ceil':
      case 'up':
        taxAmount = Math.ceil(taxAmount * precisionFix) / precisionFix;
        break;
      case 'floor':
      case 'down':
        taxAmount = Math.floor(taxAmount * precisionFix) / precisionFix;
        break;
      case 'round':
      default:
        taxAmount = Math.round(taxAmount * precisionFix) / precisionFix;
        break;
    }
    return taxAmount;
  } else {
    return taxAmountUnit * quantity; // Rounding will be done in the resolver of the total tax amount in the cart
  }
}
