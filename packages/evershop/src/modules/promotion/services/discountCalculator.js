const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const { getConfig } = require("../../../lib/util/getConfig");
const { toPrice } = require("../../checkout/services/toPrice");

exports.DiscountCalculator = class DiscountCalculator {
  static discountCalculators = [];

  constructor(cart) {
    this.cart = cart;
    this.#registerDefaultDiscountCalculator();
    this.discounts = {};
  }

  getCartTotalBeforeDiscount(cart) {
    let total = 0;
    const items = cart.getItems();
    items.forEach((item) => {
      total += item.getData('final_price') * item.getData('qty');
    })

    return total;
  }

  #registerDefaultDiscountCalculator() {
    const _this = this;
    this.constructor.addDiscountCalculator('percentage_discount_to_entire_order', function (coupon, cart) {
      if (coupon['discount_type'] !== "percentage_discount_to_entire_order") {
        return false;
      }
      const discountPercent = parseInt(coupon['discount_amount']);
      if (discountPercent <= 0 || discountPercent > 100) {
        return false;
      }

      let cartDiscountAmount = toPrice((discountPercent * _this.getCartTotalBeforeDiscount(cart)) / 100);
      let distributedAmount = 0;
      const items = cart.getItems();
      items.forEach((item, index) => {
        let sharedDiscount = 0;
        if (index === items.length - 1) {
          sharedDiscount = cartDiscountAmount - distributedAmount;
        } else {
          const rowTotal = item.getData('final_price') * item.getData('qty');
          sharedDiscount = toPrice(rowTotal * cartDiscountAmount / _this.getCartTotalBeforeDiscount(cart), 0);
        }
        if (_this.discounts[item.getId()] || _this.discounts[item.getId()] != sharedDiscount) {
          _this.discounts[item.getId()] = sharedDiscount;
        }
        distributedAmount += sharedDiscount;
      });

      return true;
    });

    this.constructor.addDiscountCalculator('fixed_discount_to_entire_order', (coupon, cart) => {
      if (coupon['discount_type'] !== "fixed_discount_to_entire_order")
        return false;

      let cartDiscountAmount = toPrice(parseFloat(coupon['discount_amount']) || 0);
      if (cartDiscountAmount < 0) {
        return false;
      }
      let cartTotal = _this.getCartTotalBeforeDiscount(cart);
      cartDiscountAmount = cartTotal > cartDiscountAmount ? cartDiscountAmount : cartTotal;
      let distributedAmount = 0;
      const items = cart.getItems();
      items.forEach((item, index) => {
        let sharedDiscount = 0;
        if (index === items.length - 1) {
          sharedDiscount = cartDiscountAmount - distributedAmount;
        } else {
          const rowTotal = item.getData('final_price') * item.getData('qty');
          sharedDiscount = toPrice(rowTotal * cartDiscountAmount / _this.getCartTotalBeforeDiscount(cart), 0);
        }
        if (_this.discounts[item.getId()] || _this.discounts[item.getId()] != sharedDiscount) {
          _this.discounts[item.getId()] = sharedDiscount;
        }
        distributedAmount += sharedDiscount;
      });

      return true;
    });

    this.constructor.addDiscountCalculator('discount_to_specific_products', async (coupon, cart) => {
      if (!["fixed_discount_to_specific_products", "percentage_discount_to_specific_products"].includes(coupon['discount_type'])) {
        return false;
      }
      let targetConfig;
      try {
        targetConfig = JSON.parse(coupon['target_products']);
      } catch (e) {
        return false;
      }

      const maxQty = parseInt(targetConfig['maxQty']) || 0;
      if (maxQty <= 0) {
        return false;
      }
      const targetProducts = targetConfig['products'] || []
      let discountAmount = toPrice(parseFloat(coupon['discount_amount']) || 0);
      let discounts = {};
      const items = cart.getItems();
      const productIds = items.map((item) => { return item.getData('product_id') });

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
          const key = targetProduct['key'];
          const operator = targetProduct['operator'];
          const value = targetProduct['value'];
          // Check attribute group
          if (key === 'attribute_group') {
            // If key is attribute group, we only support IN and NOT IN operator
            if (!['IN', 'NOT IN'].includes(operator)) {
              flag = false;
              return false;
            }
            const attributeGroupIds = value.split(',').map((id) => { return parseInt(id.trim()) });
            flag = operator === 'IN' ? attributeGroupIds.includes(item.getData('group_id')) : !attributeGroupIds.includes(item.getData('group_id'))
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

            const values = value.split(',').map((id) => { return parseInt(id.trim()) });
            let e = categories.find(
              (e) => (values.includes(e.category_id) && parseInt(e.product_id) === parseInt(item.getData('product_id')))
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
                flag = eval(`${item.getData('final_price')} ${operator} ${price}`);
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
              flag = operator === 'IN' ? skus.includes(item.getData('product_sku')) : !skus.includes(item.getData('product_sku'))
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
        if (coupon['discount_type'] == "fixed_discount_to_specific_products") {
          if (discountAmount > item.getData("final_price")) {
            discountAmount = item.getData("final_price");
          }
          discounts[item.getId()] = (maxQty > item.getData("qty")) ? toPrice(discountAmount * item.getData("qty")) : toPrice(discountAmount * maxQty);
        } else {
          const discountPercent = Math.min(discountAmount, 100);
          discounts[item.getId()] = toPrice(
            Math.min(item.getData('qty'), maxQty) * (item.getData('final_price') * discountPercent / 100)
          );;
        }
      });

      _this.discounts = discounts;
      return true;
    });

    this.constructor.addDiscountCalculator('buy_x_get_y', (coupon, cart) => {
      if (coupon['discount_type'] !== "buy_x_get_y")
        return true;

      let configs;
      try {
        configs = JSON.parse(coupon['buyx_gety']);
      } catch (e) {
        return false;
      }
      const items = cart.getItems();
      configs.forEach((row) => {
        const sku = row['sku'] ?? null;
        const buyQty = parseInt(row['buy_qty']) || null;
        const getQty = parseInt(row['get_qty']) || null;
        const maxY = row['max_y'].trim() ? Math.max(parseInt(row['max_y']), 0) : 10000000;
        const discount = row['discount'] ? (parseFloat(row['discount']) || 0) : 100;
        if (!sku || !buyQty || !getQty || discount <= 0 || discount > 100)
          return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.getData("product_sku") === sku.trim() && item.getData("qty") >= buyQty + getQty) {
            const discountPerUnit = toPrice(discount * item.getData("final_price") / 100);
            const discountAbleUnits = Math.floor(item.getData("qty") / buyQty) * getQty;
            let discountAmount;
            if (discountAbleUnits < maxY)
              discountAmount = toPrice(discountAbleUnits * discountPerUnit);
            else
              discountAmount = toPrice(discountPerUnit * maxY);

            if (_this.discounts[item.getId()] || _this.discounts[item.getId()] !== discountAmount) {
              _this.discounts[item.getId()] = discountAmount;
            }
          }
        }
      })
    });
  }

  static addDiscountCalculator(id, calculateFunction) {
    this.discountCalculators[id] = calculateFunction;
  }

  static removeDiscountCalculator(id) {
    unset(this.constructor.discountCalculators[id]);
  }

  async calculate(couponCode = null) {
    let cart = this.cart;
    if (!couponCode) {
      this.discounts = {};
      return {};
    }

    const coupon = await select().from('coupon').where('coupon', '=', couponCode).load(pool);

    // Calling calculator functions
    for (const calculatorId in this.constructor.discountCalculators) {
      await this.constructor.discountCalculators[calculatorId](coupon, cart);
    }

    return this.discounts;
  }

  getDiscounts() {
    return this.discounts;
  }
}