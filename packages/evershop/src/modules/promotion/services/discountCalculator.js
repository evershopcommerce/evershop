import { getValueSync } from '../../../lib/util/registry.js';

export async function calculateDiscount(cart, couponCode = null) {
  const calculatorFunctions = getValueSync('discountCalculatorFunctions', []);
  const couponLoader = getValueSync('couponLoaderFunction');
  const coupon = await couponLoader(couponCode);
  // Calling calculator functions
  for (let i = 0; i < calculatorFunctions.length; i += 1) {
    await calculatorFunctions[i](cart, coupon);
  }
}
