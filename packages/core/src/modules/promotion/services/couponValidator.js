const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");

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
    this.constructor.validateFunctions[id] = validateFunc;
  }

  /**
   * @param id
   * @return this
   */
  static removeValidator(id) {
    delete this.constructor.validateFunctions[id];
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
    this.constructor.addValidator('general', function (coupon) {
      if (coupon['status'] == '0') {
        return false;
      }
      const discountAmount = parseFloat(coupon['discount_amount']);
      if ((!discountAmount || discountAmount) <= 0 && coupon['discount_type'] !== "buy_x_get_y") {
        return false;
      }
      if ((coupon['start_date'] && coupon['start_date'] > date("Y-m-d H:i:s"))
        || (coupon['end_date'] && coupon['end_date'] < date("Y-m-d H:i:s"))
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
      if (minimumSubTotal && parseFloat(this.getCartTotalBeforeDiscount(cart)) < minimumSubTotal) {
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
      const items = cart.getItems();
      const conditions = JSON.parse(coupon['condition']);
      const requiredProducts = conditions['required_products'] || [];
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operation = condition['operation'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        // Validate min quantity first
        let ps = items.filter((item) => {
          return item.getData('qty') >= minQty;
        });
        // Return false if there is no item with minimum quantity
        if (ps.length === 0) {
          return false;
        }
        // Continue to next item if key is not category
        if (condition['key'] !== 'category') {
          continue;
        } else {
          if (['IN', 'NOT IN'].includes(operation)) {
            value = value.split(',').map((v) => v.trim());
            const query = select().from('product_category')
              .where('product_id', 'IN', ps.map((p) => p.getData('product_id')))
              .andWhere('category_id', 'IN', value);
            query.groupBy('product_id');
            const check = await query.execute(pool);
            if (operation === 'IN') {
              return check.length >= minQty;
            } else {
              return (ps.length - check.length) >= minQty;
            }
          } else {
            // For 'category' type of condition, we only support 'IN' and 'NOT IN' operations
            return false;
          }
        }
      }
    });
    this.constructor.addValidator('requiredProductByAttributeGroup', async (coupon, cart) => {
      const items = cart.getItems();
      const conditions = JSON.parse(coupon['condition']);
      const requiredProducts = conditions['required_products'] || [];
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operation = condition['operation'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        // Validate min quantity first
        let ps = items.filter((item) => {
          return item.getData('qty') >= minQty;
        });
        // Return false if there is no item with minimum quantity
        if (ps.length === 0) {
          return false;
        }
        // Continue to next item if key is not attribute_group
        if (condition['key'] !== 'attribute_group') {
          continue;
        } else {
          if (['IN', 'NOT IN'].includes(operation)) {
            value = value.split(',').map((v) => v.trim());
            const query = select().from('product')
              .where('product_id', 'IN', ps.map((p) => p.getData('product_id')))
              .andWhere('group_id', 'IN', value);
            const check = await query.execute(pool);
            if (operation === 'IN') {
              return check.length >= minQty;
            } else {
              return (ps.length - check.length) >= minQty;
            }
          } else {
            // For 'attribute group' type of condition, we only support 'IN' and 'NOT IN' operations
            return false;
          }
        }
      }
    });
    this.constructor.addValidator('requiredProductByPrice', async (coupon, cart) => {
      const items = cart.getItems();
      const conditions = JSON.parse(coupon['condition']);
      const requiredProducts = conditions['required_products'] || [];
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operation = condition['operation'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        // Validate min quantity first
        let ps = items.filter((item) => {
          return item.getData('qty') >= minQty;
        });
        // Return false if there is no item with minimum quantity
        if (ps.length === 0) {
          return false;
        }
        // Continue to next item if key is not price
        if (condition['key'] !== 'price') {
          continue;
        } else {
          if (['=', '!=', '>', '>=', '<', '<='].includes(operation)) {
            const query = select().from('product')
              .where('product_id', 'IN', ps.map((p) => p.getData('product_id')))
              .andWhere('group_id', operation, parseFloat(value));
            const check = await query.execute(pool);
            return check.length >= minQty;
          } else {
            // For 'price' type of condition, we do not others operations
            return false;
          }
        }
      }
    });
    this.constructor.addValidator('requiredProductBySku', async (coupon, cart) => {
      const items = cart.getItems();
      const conditions = JSON.parse(coupon['condition']);
      const requiredProducts = conditions['required_products'] || [];
      for (let index = 0; index < requiredProducts.length; index++) {
        const condition = requiredProducts[index];
        const operation = condition['operation'];
        const value = condition['value'];
        const minQty = parseInt(condition['qty']) || 1;
        // Validate min quantity first
        let ps = items.filter((item) => {
          return item.getData('qty') >= minQty;
        });
        // Return false if there is no item with minimum quantity
        if (ps.length === 0) {
          return false;
        }
        // Continue to next item if key is not sku
        if (condition['key'] !== 'sku') {
          continue;
        } else {
          if (['IN', 'NOT IN'].includes(operation)) {
            value = value.split(',').map((v) => v.trim());
            const query = select().from('product')
              .where('product_id', 'IN', ps.map((p) => p.getData('product_id')))
              .andWhere('sku', 'IN', value);
            const check = await query.execute(pool);
            if (operation === 'IN') {
              return check.length >= minQty;
            } else {
              return (ps.length - check.length) >= minQty;
            }
          } else {
            // For 'sku' type of condition, we only support 'IN' and 'NOT IN' operations
            return false;
          }
        }
      }
    });
    this.constructor.addValidator('customerGroup', async (coupon, cart) => {
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
    const coupon = await select().from('coupon').where('code', '=', couponCode).load(pool);
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