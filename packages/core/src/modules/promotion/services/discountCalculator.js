const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const { getConfig } = require("../../../lib/util/getConfig");

exports.DiscountCalculator = class DiscountCalculator {
  #cart;

  #discountCalculators = [];

  #discounts = {};

  constructor(cart) {
    this.#cart = cart;
    this.defaultDiscountCalculator();
  }

  #getCartTotalBeforeDiscount(cart) {
    let total = 0;
    const items = cart.getItems();
    items.forEach((item) => {
      total += item.getData('final_price') * item.getData('qty');
    })

    return total;
  }

  #defaultDiscountCalculator() {
    this.addDiscountCalculator('percentage_discount_to_entire_order', function (coupon, cart) {
      if (coupon['discount_type'] !== "percentage_discount_to_entire_order") {
        return false;
      }
      const discountPercent = parseInt(coupon['discount_amount']);
      if (discountPercent <= 0 || discountPercent > 100) {
        return false;
      }

      const cartDiscountAmount = (discountPercent * this.getCartTotalBeforeDiscount(cart)) / 100;
      switch (getConfig('pricing.rounding', 'round')) {
        case 'up':
          cartDiscountAmount = Math.ceil(cartDiscountAmount);
          break;
        case 'down':
          cartDiscountAmount = Math.floor(cartDiscountAmount);
          break;
        case 'round':
          cartDiscountAmount = Math.round(cartDiscountAmount);
          break;
        default:
          cartDiscountAmount = Math.round(cartDiscountAmount);
          break;
      }
      let i = 0;
      let distributedAmount = 0;
      const items = cart.getItems();
      items.forEach((item, index) => {
        let sharedDiscount = 0;
        if (i === index) {
          sharedDiscount = cartDiscountAmount - distributedAmount;
        } else {
          const rowTotal = item.getData('final_price') * item.getData('qty');
          sharedDiscount = round(rowTotal * cartDiscountAmount / this.getCartTotalBeforeDiscount(cart), 0);
        }
        if (!isset(this.#discounts[item.getId()]) || this.#discounts[item.getId()] != sharedDiscount) {
          this.#discounts[item.getId()] = sharedDiscount;
        }
        i++;
      });

      distributedAmount += sharedDiscount;
      return true;
    });

    this.addDiscountCalculator('fixed_discount_to_entire_order', (coupon, cart) => {
      if (coupon['discount_type'] !== "fixed_discount_to_entire_order")
        return false;

      const cartDiscountAmount = parseFloat(coupon['discount_amount']) || 0;

      if (cartDiscountAmount < 0) {
        return false;
      }
      const cartTotal = this.getCartTotalBeforeDiscount(cart);
      cartDiscountAmount = cartTotal > cartDiscountAmount ? cartDiscountAmount : cartTotal;
      switch (getConfig('pricing.rounding', 'round')) {
        case 'up':
          cartDiscountAmount = Math.ceil(cartDiscountAmount);
          break;
        case 'down':
          cartDiscountAmount = Math.floor(cartDiscountAmount);
          break;
        case 'round':
          cartDiscountAmount = Math.round(cartDiscountAmount);
          break;
        default:
          cartDiscountAmount = Math.round(cartDiscountAmount);
          break;
      }
      let i = 0;
      let distributedAmount = 0;
      const items = cart.getItems();
      items.forEach((item, index) => {
        let sharedDiscount = 0;
        if (i === index) {
          sharedDiscount = cartDiscountAmount - distributedAmount;
        } else {
          const rowTotal = item.getData('final_price') * item.getData('qty');
          sharedDiscount = round(rowTotal * cartDiscountAmount / this.getCartTotalBeforeDiscount(cart), 0);
        }
        if (!isset(this.#discounts[item.getId()]) || this.#discounts[item.getId()] != sharedDiscount) {
          this.#discounts[item.getId()] = sharedDiscount;
        }
        i++;
      });

      distributedAmount += sharedDiscount;
      return true;
    });

    this.addDiscountCalculator('discount_to_specific_products', async (coupon, cart) => {
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
      const discountAmount = parseFloat(coupon['discount_amount']);
      let discounts = {};
      const items = cart.getItems();
      const productIds = items.map((item) => { return item.getId() });

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
          const operation = targetProduct['operation'];
          const value = targetProduct['value'];
          // Check attribute group
          if (key === 'attribute_group') {
            // If key is attribute group, we only support IN and NOT IN operation
            if (!['IN', 'NOT IN'].includes(operation)) {
              flag = false;
              return false;
            }
            const attributeGroupIds = value.split(',').map((id) => { return id.trim() });
            flag = operation === 'IN' ? attributeGroupIds.includes(item.getData('group_id')) : !attributeGroupIds.includes(item.getData('group_id'))
          }

          // Check category
          if (key === 'category') {
            // If key is category, we only support IN and NOT IN operation
            if (!['IN', 'NOT IN'].includes(operation)) {
              flag = false;
              return false;
            }
            const values = value.split(',').map((id) => { return id.trim() });
            flag = operation === 'IN' ?
              categories.find(
                (e) => (values.includes(e.category_id) && parseInt(e.product_id) === item.getData('product_id'))
              )
              : !categories.find(
                (e) => (values.includes(e.category_id) && parseInt(e.product_id) === item.getData('product_id'))
              )
          }
          // Check price
          if (key === 'price') {
            // If key is price, we do not support IN and NOT IN operation
            if (['=', '!=', '>', '>=', '<', '<='].includes(operation)) {
              const price = parseFloat(value);
              if (!price) {
                flag = false;
                return false;
              } else {
                flag = eval(`${item.getData('price')} ${operation} ${price}`);
              }
            } else {
              // For 'price' type of condition, we do not others operations
              flag = false;
              return false;
            }
          }

          // Check sku
          if (key === 'sku') {
            if (['IN', 'NOT IN'].includes(operation)) {
              const skus = value.split(',').map((v) => v.trim());
              flag = operation === 'IN' ? skus.includes(item.getData('product_sku')) : !skus.includes(item.getData('product_sku'))
            } else {
              // For 'sku' type of condition, we only support 'IN' and 'NOT IN' operations
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
          discounts[item.getId()] = (maxQty > item.getData("qty")) ? discountAmount * item.getData("qty") : discountAmount * maxQty;
        } else {
          const discountPercent = Math.min(discountAmount, 100);
          discountAmount = Math.min(item.getData('qty'), maxQty) * (item.getData('final_price') * discountPercent / 100);
          switch (getConfig('pricing.rounding', 'round')) {
            case 'up':
              discountAmount = Math.ceil(discountAmount);
              break;
            case 'down':
              discountAmount = Math.floor(discountAmount);
              break;
            case 'round':
              discountAmount = Math.round(discountAmount);
              break;
            default:
              discountAmount = Math.round(discountAmount);
              break;
          }
        }
      });

      this.#discounts = discounts;

      return true;
    });

    this.addDiscountCalculator('buy_x_get_y', (coupon, cart) => {
      if (coupon['discount_type'] !== "buy_x_get_y")
        return true;

      let configs;
      try {
        targetProducts = JSON.parse(coupon['buyx_gety']);
      } catch (e) {
        return false;
      }
      const items = cart.getItems();
      configs.forEach((row) => {
        const sku = row['sku'] ?? null;
        const buyQty = parseInt(row['buy_qty']) || null;
        const getQty = parseInt(row['get_qty']) || null;
        const maxY = row['max_y'].trim() ? Math.min(parseInt(row['max_y']), 0) : 10000000;
        const discount = row['discount'] ? (parseFloat(row['discount']) || 0) : 100;

        if (!sku || !buyQty || !getQty || discount <= 0 || discount > 100)
          return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.getData("product_sku") === trim(sku) && item.getData("qty") >= buyQty + getQty) {
            discountPerUnit = discount * item.getData("final_price") / 100;
            discountAbleUnits = floor(item.getData("qty") / buyQty) * getQty;
            if (discountAbleUnits < maxY)
              discountAmount = discountAbleUnits * discountPerUnit;
            else
              discountAmount = discountPerUnit * maxY;

            if (!isset(this.#discounts[item.getId()]) || this.#discounts[item.getId()] !== discountAmount) {
              this.#discounts[item.getId()] = discountAmount;
            }
          }
        }
      })
    });
  }

  static addDiscountCalculator(id, calculateFunction) {
    this.#discountCalculators[id] = calculateFunction;
  }

  static removeDiscountCalculator(id) {
    unset(this.#discountCalculators[id]);
  }

  async calculate(coupon = null) {
    let cart = this.#cart;
    if (!coupon) {
      this.#discounts = {};
      return {};
    }

    // Calling calculator functions
    for (const calculatorId in this.#discountCalculators) {
      await this.#discountCalculators[calculatorId](coupon, cart);
    }

    return this.#discounts;
  }

  getDiscounts() {
    return this.#discounts;
  }
}