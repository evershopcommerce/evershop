const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');
const { select } = require('@evershop/postgres-query-builder');

exports.calculateDiscount = async function calculateDiscount(
  cart,
  couponCode = null
) {
  const calculatorFunctions = getValueSync('discountCalculatorFunctions', []);
  const coupon = await select()
    .from('coupon')
    .where('coupon', '=', couponCode)
    .load(pool);

  // Calling calculator functions
  for (let i = 0; i < calculatorFunctions.length; i += 1) {
    await calculatorFunctions[i](cart, coupon);
  }
};
