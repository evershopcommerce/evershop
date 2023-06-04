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

  // Calculate the tax amount
  let taxAmount = (totalPrice * taxPercentage) / 100;

  // Apply rounding based on the rounding option
  if (roundingLevel === 'unit') {
    taxAmount = taxAmount / quantity;
  }

  // Apply precision fix
  taxAmount =
    Math.round(taxAmount * Math.pow(10, precisionFix)) /
    Math.pow(10, precisionFix);

  // Apply rounding method
  if (rounding === 'up') {
    taxAmount = Math.ceil(taxAmount);
  } else if (rounding === 'down') {
    taxAmount = Math.floor(taxAmount);
  } else {
    taxAmount = Math.round(taxAmount);
  }

  return taxAmount;
};
