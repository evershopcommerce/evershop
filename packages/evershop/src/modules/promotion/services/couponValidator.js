const { info } = require('@evershop/evershop/src/lib/log/logger');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');

/**
 * This method validate a coupon.
 * @param {Cart} cart
 * @param {String} couponCode
 * @returns {Boolean}
 */
async function validateCoupon(cart, couponCode) {
  const validatorFunctions = getValueSync('couponValidatorFunctions', []);
  const couponLoader = getValueSync('couponLoaderFunction');
  let flag = true;
  const coupon = await couponLoader(couponCode);
  if (!coupon) {
    return false;
  }
  // Loop an object
  await Promise.all(
    validatorFunctions.map(async (func) => {
      try {
        const check = await func(cart, coupon);
        if (!check) {
          flag = false;
        }
      } catch (e) {
        info(e);
        flag = false;
      }
    })
  );
  return flag;
}

module.exports = {
  validateCoupon
};
