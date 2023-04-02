/* eslint-disable consistent-return */
const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { toPrice } = require('../../checkout/services/toPrice');
const { getCartTotalBeforeDiscount } = require('./getCartTotalBeforeDiscount');

exports.DiscountCalculator = class DiscountCalculator {
  static discountCalculators = [];

  constructor(cart) {
    this.cart = cart;
    this.#registerDefaultDiscountCalculator();
    this.discounts = {};
  }

  #registerDefaultDiscountCalculator() {
    this.constructor.addDiscountCalculator(
      'percentage_discount_to_entire_order',
      function calculate(coupon, cart) {
        if (coupon.discount_type !== 'percentage_discount_to_entire_order') {
          return false;
        }
        const discountPercent = parseInt(coupon.discount_amount, 10);
        if (discountPercent <= 0 || discountPercent > 100) {
          return false;
        }

        const cartDiscountAmount = toPrice(
          (discountPercent * getCartTotalBeforeDiscount(cart)) / 100
        );
        let distributedAmount = 0;
        const items = cart.getItems();
        items.forEach((item, index) => {
          let sharedDiscount = 0;
          if (index === items.length - 1) {
            const precision = getConfig('pricing.precision', '2');
            const precisionFix = parseInt(`1${'0'.repeat(precision)}`, 10);
            sharedDiscount =
              (cartDiscountAmount * precisionFix -
                distributedAmount * precisionFix) /
              precisionFix;
          } else {
            const rowTotal = item.getData('final_price') * item.getData('qty');
            sharedDiscount = toPrice(
              (rowTotal * cartDiscountAmount) /
                getCartTotalBeforeDiscount(cart),
              0
            );
          }
          if (
            this.discounts[item.getId()] ||
            this.discounts[item.getId()] !== sharedDiscount
          ) {
            this.discounts[item.getId()] = sharedDiscount;
          }
          distributedAmount += sharedDiscount;
        });

        return true;
      }
    );

    this.constructor.addDiscountCalculator(
      'fixed_discount_to_entire_order',
      function calculate(coupon, cart) {
        if (coupon.discount_type !== 'fixed_discount_to_entire_order')
          return false;

        let cartDiscountAmount = toPrice(
          parseFloat(coupon.discount_amount) || 0
        );
        if (cartDiscountAmount < 0) {
          return false;
        }
        const cartTotal = getCartTotalBeforeDiscount(cart);
        cartDiscountAmount =
          cartTotal > cartDiscountAmount ? cartDiscountAmount : cartTotal;
        let distributedAmount = 0;
        const items = cart.getItems();
        items.forEach((item, index) => {
          let sharedDiscount = 0;
          if (index === items.length - 1) {
            const precision = getConfig('pricing.precision', '2');
            const precisionFix = parseInt(`1${'0'.repeat(precision)}`, 10);
            sharedDiscount =
              (cartDiscountAmount * precisionFix -
                distributedAmount * precisionFix) /
              precisionFix;
          } else {
            const rowTotal = item.getData('final_price') * item.getData('qty');
            sharedDiscount = toPrice(
              (rowTotal * cartDiscountAmount) /
                getCartTotalBeforeDiscount(cart),
              0
            );
          }
          if (
            !this.discounts[item.getId()] ||
            this.discounts[item.getId()] !== sharedDiscount
          ) {
            this.discounts[item.getId()] = sharedDiscount;
          }
          distributedAmount += sharedDiscount;
        });

        return true;
      }
    );

    this.constructor.addDiscountCalculator(
      'discount_to_specific_products',
      async function calculate(coupon, cart) {
        if (
          ![
            'fixed_discount_to_specific_products',
            'percentage_discount_to_specific_products'
          ].includes(coupon.discount_type)
        ) {
          return false;
        }
        let targetConfig;
        try {
          targetConfig = JSON.parse(coupon.target_products);
        } catch (e) {
          return false;
        }

        const maxQty = parseInt(targetConfig.maxQty, 10) || 0;
        if (maxQty <= 0) {
          return false;
        }
        const targetProducts = targetConfig.products || [];
        let discountAmount = toPrice(parseFloat(coupon.discount_amount) || 0);
        const discounts = {};
        const items = cart.getItems();
        const productIds = items.map((item) => item.getData('product_id'));

        // Load the category of each item
        const categories = await select()
          .from('product_category')
          .where('product_id', 'IN', productIds)
          .execute(pool);
        items.forEach((item) => {
          // Check if the item is in the target products
          let flag = true;
          targetProducts.forEach((targetProduct) => {
            if (flag === false) {
              return;
            }
            const { key } = targetProduct;
            let { operator } = targetProduct;
            const { value } = targetProduct;
            // Check attribute group
            if (key === 'attribute_group') {
              // If key is attribute group, we only support IN and NOT IN operator
              if (!['IN', 'NOT IN'].includes(operator)) {
                flag = false;
                return false;
              }
              const attributeGroupIds = value
                .split(',')
                .map((id) => parseInt(id.trim(), 10));
              flag =
                operator === 'IN'
                  ? attributeGroupIds.includes(item.getData('group_id'))
                  : !attributeGroupIds.includes(item.getData('group_id'));
            }

            // Check category
            if (key === 'category') {
              // If key is category, we only support IN and NOT IN operator
              if (!['IN', 'NOT IN'].includes(operator)) {
                flag = false;
                return false;
              }
              if (categories.length === 0) {
                flag = false;
                return false;
              }

              const values = value
                .split(',')
                .map((id) => parseInt(id.trim(), 10));
              const e = categories.find(
                (c) =>
                  values.includes(c.category_id) &&
                  parseInt(c.product_id, 10) ===
                    parseInt(item.getData('product_id'), 10)
              );
              flag = operator === 'IN' ? e !== undefined : e === undefined;
            }
            // Check price
            if (key === 'price') {
              // If key is price, we do not support IN and NOT IN operator
              if (['=', '!=', '>', '>=', '<', '<='].includes(operator)) {
                const price = parseFloat(value);
                if (operator === '=') {
                  operator = '===';
                }
                if (!price) {
                  flag = false;
                  return false;
                } else {
                  // eslint-disable-next-line no-eval
                  flag = eval(
                    `${item.getData('final_price')} ${operator} ${price}`
                  );
                }
              } else {
                // For 'price' type of condition, we do not others operators
                flag = false;
                return false;
              }
            }

            // Check sku
            if (key === 'sku') {
              if (['IN', 'NOT IN'].includes(operator)) {
                const skus = value.split(',').map((v) => v.trim());
                flag =
                  operator === 'IN'
                    ? skus.includes(item.getData('product_sku'))
                    : !skus.includes(item.getData('product_sku'));
              } else {
                // For 'sku' type of condition, we only support 'IN', 'NOT IN' operators
                flag = false;
                return false;
              }
            }
          });

          // If cart item does not match the target products, we do not apply the discount
          if (flag === false) {
            return;
          }
          if (coupon.discount_type === 'fixed_discount_to_specific_products') {
            if (discountAmount > item.getData('final_price')) {
              discountAmount = item.getData('final_price');
            }
            discounts[item.getId()] =
              maxQty > item.getData('qty')
                ? toPrice(discountAmount * item.getData('qty'))
                : toPrice(discountAmount * maxQty);
          } else {
            const discountPercent = Math.min(discountAmount, 100);
            discounts[item.getId()] = toPrice(
              (Math.min(item.getData('qty'), maxQty) *
                (item.getData('final_price') * discountPercent)) /
                100
            );
          }
        });

        this.discounts = discounts;
        return true;
      }
    );

    this.constructor.addDiscountCalculator(
      'buy_x_get_y',
      function calculate(coupon, cart) {
        if (coupon.discount_type !== 'buy_x_get_y') {
          return true;
        }
        let configs;
        try {
          configs = JSON.parse(coupon.buyx_gety);
        } catch (e) {
          return false;
        }
        const items = cart.getItems();
        configs.forEach((row) => {
          const sku = row.sku ?? null;
          const buyQty = parseInt(row.buy_qty, 10) || null;
          const getQty = parseInt(row.get_qty, 10) || null;
          const maxY = row.max_y.trim()
            ? Math.max(parseInt(row.max_y, 10), 0)
            : 10000000;
          const discount = row.discount ? parseFloat(row.discount) || 0 : 100;
          if (!sku || !buyQty || !getQty || discount <= 0 || discount > 100) {
            return;
          }

          for (let i = 0; i < items.length; i += 1) {
            const item = items[i];
            if (
              item.getData('product_sku') === sku.trim() &&
              item.getData('qty') >= buyQty + getQty
            ) {
              const discountPerUnit = toPrice(
                (discount * item.getData('final_price')) / 100
              );
              const discountAbleUnits =
                Math.floor(item.getData('qty') / buyQty) * getQty;
              let discountAmount;
              if (discountAbleUnits < maxY) {
                discountAmount = toPrice(discountAbleUnits * discountPerUnit);
              } else {
                discountAmount = toPrice(discountPerUnit * maxY);
              }

              if (
                this.discounts[item.getId()] ||
                this.discounts[item.getId()] !== discountAmount
              ) {
                this.discounts[item.getId()] = discountAmount;
              }
            }
          }
        });
      }
    );
  }

  static addDiscountCalculator(id, calculateFunction) {
    this.discountCalculators[id] = calculateFunction;
  }

  static removeDiscountCalculator(id) {
    delete this.constructor.discountCalculators[id];
  }

  async calculate(couponCode = null) {
    const { cart } = this;
    if (!couponCode) {
      this.discounts = {};
      return {};
    }

    const coupon = await select()
      .from('coupon')
      .where('coupon', '=', couponCode)
      .load(pool);

    // Calling calculator functions
    const promises = [];

    Object.keys(this.constructor.discountCalculators).forEach(
      (calculatorId) => {
        promises.push(
          this.constructor.discountCalculators[calculatorId].call(
            this,
            coupon,
            cart
          )
        );
      }
    );
    await Promise.all(promises);

    return this.discounts;
  }

  getDiscounts() {
    return this.discounts;
  }
};
