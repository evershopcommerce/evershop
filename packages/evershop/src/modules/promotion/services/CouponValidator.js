const { select } = require('@evershop/postgres-query-builder');
const { DateTime } = require('luxon');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getCartTotalBeforeDiscount } = require('./getCartTotalBeforeDiscount');

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
   * This method registers list of default coupon validators.
   */
  #defaultValidator() {
    this.constructor.addValidator('general', (coupon) => {
      if (coupon.status !== true) {
        return false;
      }
      const discountAmount = parseFloat(coupon.discount_amount);
      if (
        (!discountAmount || discountAmount) <= 0 &&
        coupon.discount_type !== 'buy_x_get_y'
      ) {
        return false;
      }
      const today = DateTime.local().setZone('UTC');
      const startDate = coupon.start_date
        ? DateTime.fromJSDate(coupon.start_date, { zone: 'UTC' })
        : today.minus({ days: 1 });
      const endDate = coupon.end_date
        ? DateTime.fromJSDate(coupon.end_date, { zone: 'UTC' })
        : today.plus({ days: 1 });

      if (startDate < today && endDate > today) {
        return true;
      } else {
        return false;
      }
    });

    this.constructor.addValidator('timeUsed', async (coupon, cart) => {
      if (
        coupon.max_uses_time_per_coupon &&
        parseInt(coupon.used_time, 10) >=
          parseInt(coupon.max_uses_time_per_coupon, 10)
      ) {
        return false;
      }
      if (coupon.max_uses_time_per_customer) {
        const customerId = cart.getData('customer_id');
        if (customerId) {
          const flag = await select()
            .from('customer_coupon_use')
            .where('customer_id', '=', customerId)
            .andWhere('coupon', '=', coupon.coupon)
            .andWhere(
              'used_time',
              '>=',
              parseInt(coupon.max_uses_time_per_customer, 10)
            )
            .execute(pool);
          if (flag) {
            return false;
          }
        }
      }

      return true;
    });

    this.constructor.addValidator('customerGroup', (coupon, cart) => {
      const conditions = coupon.condition;
      const userConditions = coupon.user_condition;
      if (userConditions.group && !userConditions.customer_group.includes(0)) {
        const customerGroupId = cart.getData('customer_group_id');
        if (!conditions.customer_group.includes(customerGroupId)) {
          return false;
        }
      }
      return true;
    });

    this.constructor.addValidator('subTotal', (coupon, cart) => {
      const conditions = coupon.condition;
      const minimumSubTotal = !Number.isNaN(parseFloat(conditions.order_total))
        ? parseFloat(conditions.order_total)
        : null;
      if (
        minimumSubTotal &&
        parseFloat(getCartTotalBeforeDiscount(cart)) < minimumSubTotal
      ) {
        return false;
      }
      return true;
    });

    this.constructor.addValidator('minimumQty', (coupon, cart) => {
      const conditions = coupon.condition;
      const minimumQty = !Number.isNaN(parseInt(conditions.order_qty, 10))
        ? parseInt(conditions.order_qty, 10)
        : null;
      if (minimumQty && cart.getData('total_qty') < minimumQty) {
        return false;
      }
      return true;
    });

    this.constructor.addValidator(
      'requiredProductByCategory',
      async (coupon, cart) => {
        let flag = true;
        const items = cart.getItems();
        const conditions = coupon.condition;
        const requiredProducts = conditions.required_products || [];
        if (requiredProducts.length === 0) {
          return true;
        }
        for (let index = 0; index < requiredProducts.length; index += 1) {
          const condition = requiredProducts[index];
          const { operator } = condition;
          const { value } = condition;
          const minQty = parseInt(condition.qty, 10) || 1;
          let qty = 0;
          // Continue to next item if key is not category
          if (condition.key !== 'category') {
            // eslint-disable-next-line no-continue
            continue;
          } else if (
            ['IN', 'NOT IN'].includes(operator) &&
            Array.isArray(value)
          ) {
            const requiredCategoryIds = value.map((v) =>
              parseInt(v.trim(), 10)
            );
            if (operator === 'IN') {
              // eslint-disable-next-line no-loop-func
              items.forEach((item) => {
                const categoryId = item.getData('category_id');
                if (requiredCategoryIds.includes(categoryId)) {
                  qty += item.getData('qty');
                }
              });
            } else {
              // eslint-disable-next-line no-loop-func
              items.forEach((item) => {
                const categoryId = item.getData('category_id');
                if (!requiredCategoryIds.includes(categoryId)) {
                  qty += item.getData('qty');
                }
              });
            }
          } else {
            // For category based condition, we only support 'IN' and 'NOT IN' operators
            flag = false;
            return false;
          }
          if (qty < minQty) {
            flag = false;
          }
        }
        return flag;
      }
    );

    this.constructor.addValidator(
      'requiredProductByCollection',
      async (coupon, cart) => {
        let flag = true;
        const items = cart.getItems();
        const conditions = coupon.condition;
        const requiredProducts = conditions.required_products || [];
        if (requiredProducts.length === 0) {
          return true;
        }
        let collections;
        for (let index = 0; index < requiredProducts.length; index += 1) {
          const condition = requiredProducts[index];
          const { operator } = condition;
          const { value } = condition;

          const minQty = parseInt(condition.qty, 10) || 1;
          let qty = 0;
          // Continue to next item if key is not collection based requirement
          if (condition.key !== 'collection') {
            // eslint-disable-next-line no-continue
            continue;
          } else if (
            ['IN', 'NOT IN'].includes(operator) &&
            Array.isArray(value)
          ) {
            const requiredCollectionIDs = value.map((v) =>
              parseInt(v.trim(), 10)
            );
            const productIds = items.map((item) => item.getData('product_id'));
            // Load the collections of all item
            if (!collections) {
              // eslint-disable-next-line no-await-in-loop
              collections = await select()
                .from('product_collection')
                .where('product_id', 'IN', productIds)
                .execute(pool);
            }
            if (operator === 'IN') {
              // eslint-disable-next-line no-loop-func
              items.forEach((item) => {
                const productId = item.getData('product_id');
                const collectionIDs = collections.filter(
                  (collection) =>
                    parseInt(collection.product_id, 10) === productId &&
                    requiredCollectionIDs.includes(
                      parseInt(collection.collection_id, 10)
                    )
                );
                if (collectionIDs.length > 0) {
                  qty += item.getData('qty');
                }
              });
            } else {
              // eslint-disable-next-line no-loop-func
              items.forEach((item) => {
                const productId = item.getData('product_id');
                const collectionIDs = collections.filter(
                  (collection) =>
                    parseInt(collection.product_id, 10) === productId &&
                    requiredCollectionIDs.includes(
                      parseInt(collection.collection_id, 10)
                    )
                );
                if (collectionIDs.length === 0) {
                  qty += item.getData('qty');
                }
              });
            }
          } else {
            // For collection based condition, we only support 'IN' and 'NOT IN' operators
            flag = false;
            return false;
          }
          if (qty < minQty) {
            flag = false;
          }
        }
        return flag;
      }
    );

    this.constructor.addValidator(
      'requiredProductByAttributeGroup',
      async (coupon, cart) => {
        let flag = true;
        const items = cart.getItems();
        const conditions = coupon.condition;

        const requiredProducts = conditions.required_products || [];
        if (requiredProducts.length === 0) {
          return true;
        }
        for (let index = 0; index < requiredProducts.length; index += 1) {
          const condition = requiredProducts[index];
          const { operator } = condition;
          let { value } = condition;
          const minQty = parseInt(condition.qty, 10) || 1;
          let qty = 0;
          // Continue to next item if key is not attribute_group
          if (condition.key !== 'attribute_group') {
            // eslint-disable-next-line no-continue
            continue;
          } else if (
            ['IN', 'NOT IN'].includes(operator) &&
            Array.isArray(value)
          ) {
            value = value.map((v) => parseInt(v.trim(), 10));
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
          if (qty < minQty) {
            flag = false;
          }
        }
        return flag;
      }
    );

    this.constructor.addValidator(
      'requiredProductByPrice',
      async (coupon, cart) => {
        let flag = true;
        const items = cart.getItems();
        const conditions = coupon.condition;
        const requiredProducts = conditions.required_products || [];
        if (requiredProducts.length === 0) {
          return true;
        }
        for (let index = 0; index < requiredProducts.length; index += 1) {
          const condition = requiredProducts[index];
          let { operator } = condition;
          const value = parseFloat(condition.value);
          const minQty = parseInt(condition.qty, 10) || 1;
          let qty = 0;
          if (Number.isNaN(value) || value === null || value < 0) {
            flag = false;
            break;
          }
          // Continue to next item if key is not price
          if (condition.key !== 'price') {
            // eslint-disable-next-line no-continue
            continue;
          } else if (['=', '!=', '>', '>=', '<', '<='].includes(operator)) {
            if (operator === '=') {
              operator = '===';
            }
            items.forEach((item) => {
              // eslint-disable-next-line no-eval
              if (eval(`${item.getData('final_price')} ${operator} ${value}`)) {
                qty += item.getData('qty');
              }
            });
          } else {
            // For 'price' type of condition, we do not others operators
            flag = false;
            return false;
          }
          if (qty < minQty) {
            flag = false;
          }
        }
        return flag;
      }
    );

    this.constructor.addValidator(
      'requiredProductBySku',
      async (coupon, cart) => {
        let flag = true;
        const items = cart.getItems();
        const conditions = coupon.condition;
        const requiredProducts = conditions.required_products || [];
        if (requiredProducts.length === 0) {
          return true;
        }
        for (let index = 0; index < requiredProducts.length; index += 1) {
          const condition = requiredProducts[index];
          const { operator } = condition;
          let { value } = condition;
          const minQty = parseInt(condition.qty, 10) || 1;
          let qty = 0;
          // Continue to next item if key is not attribute_group
          if (condition.key !== 'sku') {
            // eslint-disable-next-line no-continue
            continue;
          } else if (
            ['IN', 'NOT IN'].includes(operator) &&
            Array.isArray(value)
          ) {
            value = value.map((v) => v.trim());
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
          if (qty < minQty) {
            flag = false;
          }
        }

        return flag;
      }
    );
    this.constructor.addValidator('customerGroup', async () => true);
    this.constructor.addValidator('customerEmail', async (coupon, cart) => {
      const conditions = coupon.user_condition;
      const allowEmails = conditions.emails || [];

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

    this.constructor.addValidator(
      'customerPurchasesAmount',
      async (coupon, cart) => {
        const conditions = coupon.user_condition;
        const purchasedAmount = parseFloat(conditions.purchased.trim()) || null;

        // Null means no condition
        if (purchasedAmount === null) {
          return true;
        }
        // When purchased amount is set, no guest are allowed
        if (!cart.getData('customer_id')) {
          return false;
        }

        const query = select();
        query
          .from('order')
          .select('SUM(grand_total)', 'total')
          .where('customer_id', '=', cart.getData('customer_id'))
          .andWhere('payment_status', '=', 'paid');
        const grandTotal = await query.load(pool);
        if (grandTotal.total < purchasedAmount) {
          return false;
        }
        return true;
      }
    );
  }

  /**
   * This method validate a coupon.
   */
  async validate(couponCode, cart) {
    let flag = true;
    const coupon = await select()
      .from('coupon')
      .where('coupon', '=', couponCode)
      .load(pool);
    if (!coupon) {
      return false;
    }
    const validators = this.constructor.validateFunctions;
    // Loop an object
    await Promise.all(
      Object.keys(validators).map(async (id) => {
        const validateFunc = validators[id];
        try {
          const check = await validateFunc(coupon, cart);
          if (!check) {
            flag = false;
          }
        } catch (e) {
          flag = false;
        }
      })
    );

    return flag;
  }
};
