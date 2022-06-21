const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const dayjs = require('dayjs');

exports.Validator = class Validator {
  static validateFunctions = {};

  constructor() {
    this.#defaultValidator();
  }

  /**
   * @param id
   * @param validateFunc. This function will be executed every time we validate a coupon.
   * It will receive 2 arguments are Cart object and and array of coupon data.
   * @return this
   */
  static addValidator(id, validateFunc) {
    this.validateFunctions[id] = validateFunc;
  }

  /**
   * @param id
   * @return this
   */
  static removeValidator(id) {
    delete this.validateFunctions[id];
  }

  /**
   * @param cart
   * @return float|int
   */
  getCartTotalBeforeDiscount(cart) {
    let total = 0;
    const items = cart.getItems();
    items.forEach((item) => {
      total += item.getData('final_price') * item.getData('qty');
    })

    return total;
  }

  /**
   * This method registers list of default coupon validators.
   */
  #defaultValidator() {
    let _this = this;
    this.constructor.addValidator('general', function (coupon) {
      if (coupon['status'] != '1') {
        return false;
      }
      const discountAmount = parseFloat(coupon['discount_amount']);
      if ((!discountAmount || discountAmount) <= 0 && coupon['discount_type'] !== "buy_x_get_y") {
        return false;
      }
      const today = dayjs().format('YYYY-MM-DD').toString();
      if ((coupon['start_date'] && coupon['start_date'] > today)
        || (coupon['end_date'] && coupon['end_date'] < today)
      ) {
        return false;
      }

      return true;
    });
    this.constructor.addValidator('timeUsed', async function (coupon, cart) {
      if (coupon['max_uses_time_per_coupon']
        && parseInt(coupon['used_time']) >= parseInt(coupon['max_uses_time_per_coupon'])
      ) {
        return false;
      }
      if (
        coupon['max_uses_time_per_customer']
      ) {
        customerId = cart.getData('customer_id');
        if (customerId) {
          flag = await select().from('customer_coupon_use')
            .where('customer_id', '=', customerId)
            .andWhere('coupon', '=', coupon['coupon'])
            .andWhere('used_time', '>=', parseInt(coupon['max_uses_time_per_customer']))
            .execute(pool);
          if (flag) {
            return false;
          }
        }
      }

      return true;
    });
    this.constructor.addValidator('customerGroup', function (coupon, cart) {
      const userConditions = JSON.parse(coupon['user_condition']);
      if (userConditions['group']
        && !userConditions['customer_group'].includes(0)
      ) {
        const customerGroupId = cart.getData('customer_group_id');
        if (!conditions['customer_group'].includes(customerGroupId)) {
          return false;
        }
      }

      return true;
    });
    this.constructor.addValidator('subTotal', function (coupon, cart) {
      const conditions = JSON.parse(coupon['condition']);
      const minimumSubTotal = parseFloat(conditions['order_total']) !== NaN ? parseFloat(conditions['order_total']) : null;
      if (minimumSubTotal && parseFloat(_this.getCartTotalBeforeDiscount(cart)) < minimumSubTotal) {
        return false;
      }

      return true;
    });
    this.constructor.addValidator('minimumQty', function (coupon, cart) {
      const conditions = JSON.parse(coupon['condition']);
      const minimumQty = parseInt(conditions['order_qty']) !== NaN ? parseInt(conditions['order_qty']) : null;
      if (minimumQty && cart.getData('total_qty') < minimumQty) {
        return false;
      }

      return true;
    });
    this.constructor.addValidator('requiredProductByCategory', async (coupon, cart) => {
      let flag = true;
      const items = cart.getItems();
      let conditions;
      try {
        conditions = JSON.parse(coupon['condition']);
      } catch (e) {
        return false;
      }
      const requiredProducts = conditions['required_products'] || [];
      if (requiredProducts.length === 0) {
        return true;
      }
      let categories = undefined;
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operator = condition['operator'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        let qty = 0;
        // Continue to next item if key is not category
        if (condition['key'] !== 'category') {
          continue;
        } else {
          if (['IN', 'NOT IN'].includes(operator)) {
            const productIds = items.map((item) => { return item.getData('product_id') });
            // Load the categories of all item
            if (!categories) {
              categories = await select()
                .from('product_category')
                .where('product_id', 'IN', productIds)
                .execute(pool);
            }
            value = value.split(',').map((v) => parseInt(v.trim()));
            if (operator === 'IN') {
              items.forEach((item) => {
                const productId = item.getData('product_id');
                const categoryIds = categories.filter((category) => {
                  return parseInt(category.product_id) === productId && value.includes(parseInt(category.category_id));
                });
                if (categoryIds.length > 0) {
                  qty += item.getData('qty');
                }
              });
            } else {
              items.forEach((item) => {
                const productId = item.getData('product_id');
                const categoryIds = categories.filter((category) => {
                  return parseInt(category.product_id) === productId && value.includes(parseInt(category.category_id));
                });
                if (categoryIds.length === 0) {
                  qty += item.getData('qty');
                }
              });
            }
          } else {
            // For 'category' type of condition, we only support 'IN' and 'NOT IN' operators
            flag = false;
            return false;
          }
        }
        if (qty < minQty) {
          flag = false;
        }
      }

      return flag;
    });
    this.constructor.addValidator('requiredProductByAttributeGroup', async (coupon, cart) => {
      let flag = true;
      const items = cart.getItems();
      let conditions;
      try {
        conditions = JSON.parse(coupon['condition']);
      } catch (e) {
        return false;
      }
      const requiredProducts = conditions['required_products'] || [];
      if (requiredProducts.length === 0) {
        return true;
      }
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operator = condition['operator'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        let qty = 0;
        // Continue to next item if key is not attribute_group
        if (condition['key'] !== 'attribute_group') {
          continue;
        } else {
          if (['IN', 'NOT IN'].includes(operator)) {
            value = value.split(',').map((v) => parseInt(v.trim()));
            if (operator === 'IN') {
              items.forEach((item) => {
                if (value.includes(item.getData('group_id'))) {
                  qty += item.getData('qty');
                }
              });
            } else {
              items.forEach((item) => {
                if (!value.includes(item.getData('group_id'))) {
                  qty += item.getData('qty');
                }
              });
            }
          } else {
            // For 'attribute group' type of condition, we only support 'IN' and 'NOT IN' operators
            flag = false;
            return false;
          }
        }
        if (qty < minQty) {
          flag = false;
        }
      }

      return flag;
    });

    this.constructor.addValidator('requiredProductByPrice', async (coupon, cart) => {
      let flag = true;
      const items = cart.getItems();
      let conditions;
      try {
        conditions = JSON.parse(coupon['condition']);
      } catch (e) {
        return false;
      }
      const requiredProducts = conditions['required_products'] || [];
      if (requiredProducts.length === 0) {
        return true;
      }
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operator = condition['operator'];
        const value = parseFloat(condition['value']);
        const minQty = parseInt(condition['qty']) || 1;
        let qty = 0;
        if (value === NaN || value === null || value < 0 || value === NaN) {
          flag = false;
          break;
        }
        // Continue to next item if key is not price
        if (condition['key'] !== 'price') {
          continue;
        } else {
          if (['=', '!=', '>', '>=', '<', '<='].includes(operator)) {
            if (operator === '=') {
              operator = '===';
            }
            items.forEach((item) => {
              if (eval(`${item.getData('final_price')} ${operator} ${value}`)) {
                qty += item.getData('qty');
              }
            });
          } else {
            // For 'price' type of condition, we do not others operators
            flag = false;
            return false;
          }
        }
        if (qty < minQty) {
          flag = false;
        }
      }
      return flag;
    });

    this.constructor.addValidator('requiredProductBySku', async (coupon, cart) => {
      let flag = true;
      const items = cart.getItems();
      let conditions;
      try {
        conditions = JSON.parse(coupon['condition']);
      } catch (e) {
        return false;
      }
      const requiredProducts = conditions['required_products'] || [];
      if (requiredProducts.length === 0) {
        return true;
      }
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operator = condition['operator'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        let qty = 0;
        // Continue to next item if key is not attribute_group
        if (condition['key'] !== 'sku') {
          continue;
        } else {
          if (['IN', 'NOT IN'].includes(operator)) {
            value = value.split(',').map((v) => v.trim());
            if (operator === 'IN') {
              items.forEach((item) => {
                if (value.includes(item.getData('product_sku'))) {
                  qty += item.getData('qty');
                }
              });
            } else {
              items.forEach((item) => {
                if (!value.includes(item.getData('product_sku'))) {
                  qty += item.getData('qty');
                }
              });
            }
          } else {
            // For 'attribute group' type of condition, we only support 'IN' and 'NOT IN' operators
            flag = false;
            return false;
          }
        }
        if (qty < minQty) {
          flag = false;
        }
      }

      return flag;
    });
    this.constructor.addValidator('customerGroup', async (coupon, cart) => {
      return true;// TODO: Update later customer group
      const conditions = JSON.parse(coupon['user_condition']);
      const allowGroups = conditions['groups'] || [];
      // No group means all groups
      if (allowGroups.length === 0) {
        return true;
      }
      if (allowGroups.includes(cart.getData('customer_group_id'))) {
        return true;
      }

      return false;
    });
    this.constructor.addValidator('customerEmail', async (coupon, cart) => {
      const conditions = JSON.parse(coupon['user_condition']);
      const allowEmails = conditions['emails'] || [];

      // No email means all emails
      if (allowEmails.length === 0) {
        return true;
      }
      // When emails is set, no guest are allowed
      if (!cart.getData('customer_id')) {
        return false;
      }

      if (!allowEmails.includes(cart.getData('customer_email'))) {
        return false;
      }

      return true;
    });
    this.constructor.addValidator('customerPurchasesAmount', async (coupon, cart) => {
      const conditions = JSON.parse(coupon['user_condition']);
      const purchasedAmount = parseFloat(conditions['purchased'].trim()) || null;

      // Null means no condition
      if (purchasedAmount === null) {
        return true;
      }
      // When purchased amount is set, no guest are allowed
      if (!cart.getData('customer_id')) {
        return false;
      }

      let query = select();
      query.from('order')
        .select('SUM(grand_total)', 'total')
        .where('customer_id', '=', cart.getData('customer_id'))
        .andWhere('payment_status', '=', 'paid');
      const grandTotal = await query.load(pool);
      if (grandTotal['total'] < purchasedAmount) {
        return false;
      }
      return true;
    })
  }
  /**
   * This method validate a coupon.
   */
  async validate(couponCode, cart) {
    let flag = true;
    const coupon = await select().from('coupon').where('coupon', '=', couponCode).load(pool);
    if (!coupon) {
      return false;
    }
    const validators = this.constructor.validateFunctions;
    // Loop an object
    for (const id in validators) {
      const validateFunc = validators[id];
      try {
        const check = await validateFunc(coupon, cart);
        if (!check) {
          flag = false;
          break;
        }
      } catch (e) {
        flag = false;
        break;
      }
    }

    return flag;
  }
}