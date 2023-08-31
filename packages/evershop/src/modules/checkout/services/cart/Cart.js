/* eslint-disable no-underscore-dangle */
const isEqualWith = require('lodash/isEqualWith');
const { select, del } = require('@evershop/postgres-query-builder');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { default: axios } = require('axios');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { DataObject } = require('./DataObject');
const { Item } = require('./Item');
const { toPrice } = require('../toPrice');
const { getSetting } = require('../../../setting/services/setting');
const { getTaxPercent } = require('../../../tax/services/getTaxPercent');
const { getTaxRates } = require('../../../tax/services/getTaxRates');
const {
  calculateTaxAmount
} = require('../../../tax/services/calculateTaxAmount');
// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.Cart = class Cart extends DataObject {
  static fields = [
    {
      key: 'cart_id',
      resolvers: [
        async function resolver() {
          if (this.dataSource.cart_id) {
            const cart = await select()
              .from('cart')
              .where('cart_id', '=', this.dataSource.cart_id)
              .load(pool);
            if (!cart || cart.status === 0) {
              this.errors.cart_id = 'Cart does not exist';
              this.dataSource = {};
              return null;
            } else {
              return cart.cart_id;
            }
          } else {
            return undefined;
          }
        }
      ]
    },
    {
      key: 'uuid',
      resolvers: [
        function resolver() {
          const key = uuidv4();
          // Replace all '-' with '' from key
          return this.dataSource.uuid
            ? this.dataSource.uuid
            : key.replace(/-/g, '');
        }
      ],
      dependencies: ['cart_id']
    },
    {
      key: 'currency',
      resolvers: [
        async function resolver() {
          const currency = getConfig('shop.currency', 'USD');
          return currency;
        }
      ]
    },
    {
      key: 'user_ip',
      resolvers: [
        async function resolver() {
          return this.dataSource.user_ip ?? this.getData('user_ip') ?? null;
        }
      ]
    },
    {
      key: 'sid',
      resolvers: [
        async function resolver() {
          return this.dataSource.sid;
        }
      ]
    },
    {
      key: 'status',
      resolvers: [
        async function resolver() {
          return this.dataSource.status ?? this.getData('status') ?? 1;
        }
      ]
    },
    {
      key: 'total_qty',
      resolvers: [
        async function resolver() {
          let count = 0;
          const items = this.getItems();
          items.forEach((i) => {
            count += parseInt(i.getData('qty'), 10);
          });
          return count;
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'total_weight',
      resolvers: [
        async function resolver() {
          let weight = 0;
          const items = this.getItems();
          items.forEach((i) => {
            weight += i.getData('product_weight') * i.getData('qty');
          });
          return weight;
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'tax_amount',
      resolvers: [
        async function resolver() {
          // Sum all tax amount from items
          let taxAmount = 0;
          const items = this.getItems();
          items.forEach((i) => {
            taxAmount += i.getData('tax_amount');
          });
          return taxAmount;
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'sub_total',
      resolvers: [
        async function resolver() {
          let total = 0;
          const items = this.getItems();
          items.forEach((i) => {
            total += i.getData('final_price') * i.getData('qty');
          });
          return toPrice(total);
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'grand_total',
      resolvers: [
        async function resolver() {
          return (
            this.getData('sub_total') +
            this.getData('shipping_fee_incl_tax') +
            this.getData('tax_amount')
          );
        }
      ],
      dependencies: ['sub_total', 'shipping_fee_incl_tax']
    },
    {
      key: 'shipping_zone_id',
      resolvers: [
        async function resolver() {
          if (!this.dataSource.shipping_zone_id) {
            return null;
          } else {
            const zone = await select()
              .from('shipping_zone')
              .where('shipping_zone_id', '=', this.dataSource.shipping_zone_id)
              .load(pool);
            if (!zone) {
              return null;
            } else {
              return zone.shipping_zone_id;
            }
          }
        }
      ],
      dependencies: ['cart_id']
    },
    {
      key: 'shipping_address_id',
      resolvers: [
        async function resolver() {
          if (
            !this.dataSource.shipping_address_id ||
            !this.getData('shipping_zone_id')
          ) {
            return null;
          } else {
            // validate country and province with shipping zone
            const shippingAddress = await select()
              .from('cart_address')
              .where(
                'cart_address_id',
                '=',
                this.dataSource.shipping_address_id
              )
              .load(pool);
            if (!shippingAddress) {
              return null;
            }
            const shippingZoneQuery = select().from('shipping_zone');
            shippingZoneQuery
              .leftJoin('shipping_zone_province')
              .on(
                'shipping_zone_province.zone_id',
                '=',
                'shipping_zone.shipping_zone_id'
              );
            shippingZoneQuery.where(
              'shipping_zone.country',
              '=',
              shippingAddress.country
            );

            const shippingZoneProvinces = await shippingZoneQuery.execute(pool);
            if (shippingZoneProvinces.length === 0) {
              return null;
            } else {
              const check = shippingZoneProvinces.find(
                (p) =>
                  p.province === shippingAddress.province || p.province === null
              );
              if (!check) {
                return null;
              } else {
                return shippingAddress.cart_address_id;
              }
            }
          }
        }
      ],
      dependencies: ['cart_id', 'shipping_zone_id']
    },
    {
      key: 'shippingAddress',
      resolvers: [
        async function resolver() {
          if (!this.getData('shipping_address_id')) {
            return undefined;
          } else {
            return {
              ...(await select()
                .from('cart_address')
                .where(
                  'cart_address_id',
                  '=',
                  this.getData('shipping_address_id')
                )
                .load(pool))
            };
          }
        }
      ],
      dependencies: ['shipping_address_id']
    },
    {
      key: 'shipping_method',
      resolvers: [
        async function resolver() {
          if (!this.dataSource.shipping_method) {
            return null;
          }
          if (!this.getData('shipping_address_id')) {
            return null;
          }
          // By default, EverShop supports free shipping and flat rate shipping method
          // Load shipping method from database
          const shippingMethodQuery = select().from('shipping_method');
          shippingMethodQuery
            .innerJoin('shipping_zone_method')
            .on(
              'shipping_method.shipping_method_id',
              '=',
              'shipping_zone_method.method_id'
            );
          shippingMethodQuery
            .where('uuid', '=', this.dataSource.shipping_method)
            .and(
              'shipping_zone_method.zone_id',
              '=',
              this.getData('shipping_zone_id')
            );
          const shippingMethod = await shippingMethodQuery.load(pool);
          if (!shippingMethod) {
            return null;
          } else {
            // Validate shipping method using max weight and max price, min weight and min price
            const { max, min } = shippingMethod;
            const total_weight = this.getData('total_weight');
            const sub_total = this.getData('sub_total');
            let flag = false;

            if (shippingMethod.condition_type === 'weight') {
              if (
                total_weight >= toPrice(min) &&
                total_weight <= toPrice(max)
              ) {
                flag = true;
              }
            }
            if (shippingMethod.condition_type === 'price') {
              if (sub_total >= toPrice(min) && sub_total <= toPrice(max)) {
                flag = true;
              }
            }
            if (shippingMethod.condition_type === null) {
              flag = true;
            }
            if (flag === false) {
              this.errors.shipping_method = 'Shipping method is not valid';
              return null;
            } else {
              return shippingMethod.uuid;
            }
          }
        }
      ],
      dependencies: [
        'shipping_address_id',
        'sub_total',
        'total_weight',
        'total_qty'
      ]
    },
    {
      key: 'shipping_method_name',
      resolvers: [
        async function resolver() {
          if (!this.getData('shipping_method')) {
            return null;
          } else {
            const shippingMethod = await select()
              .from('shipping_method')
              .where('uuid', '=', this.getData('shipping_method'))
              .load(pool);
            return shippingMethod.name;
          }
        }
      ],
      dependencies: ['shipping_method']
    },
    {
      key: 'shipping_fee_excl_tax',
      resolvers: [
        async function resolver() {
          if (!this.getData('shipping_method')) {
            return 0;
          } else {
            // Check if the coupon is free shipping
            const coupon = await select()
              .from('coupon')
              .where('coupon.coupon', '=', this.getData('coupon'))
              .load(pool);
            if (coupon && coupon.free_shipping) {
              return 0;
            }
            const shippingMethodQuery = select().from('shipping_method');
            shippingMethodQuery
              .innerJoin('shipping_zone_method')
              .on(
                'shipping_method.shipping_method_id',
                '=',
                'shipping_zone_method.method_id'
              );
            shippingMethodQuery
              .where('uuid', '=', this.dataSource.shipping_method)
              .and(
                'shipping_zone_method.zone_id',
                '=',
                this.getData('shipping_zone_id')
              );
            const shippingMethod = await shippingMethodQuery.load(pool);
            // Check if the method is flat rate
            if (shippingMethod.cost !== null) {
              return toPrice(shippingMethod.cost);
            } else if (shippingMethod.calculate_api) {
                // Call the API of the shipping method to calculate the shipping fee. This is an internal API
                // use axios to call the API
                // Ignore http status error
                let api = 'http://localhost:3000';
                try {
                  api += buildUrl(shippingMethod.calculate_api, {
                    cart_id: this.getData('uuid'),
                    method_id: shippingMethod.uuid
                  });
                } catch (e) {
                  throw new Error(
                    `Your shipping calculate API ${shippingMethod.calculate_api} is invalid`
                  );
                }
                const response = await axios.get(api);
                if (response.status < 400) {
                  return toPrice(response.data.data.cost);
                } else {
                  this.errors.shipping_fee_excl_tax = 'response.data.message';
                  return 0;
                }
              } else {
                this.errors.shipping_fee_excl_tax =
                  'Could not calculate shipping fee';
                return 0;
              }
          }
        }
      ],
      dependencies: ['shipping_method']
    },
    {
      key: 'shipping_fee_incl_tax',
      resolvers: [
        async function resolver() {
          if (this.getData('shipping_fee_excl_tax') === 0) {
            return 0;
          }
          let shippingTaxClass = await getSetting(
            'defaultShippingTaxClassId',
            ''
          );

          // -1: Protional allocation based on the items
          // 0: Highest tax rate based on the items
          if (shippingTaxClass === '') {
            return this.getData('shipping_fee_excl_tax');
          } else {
            shippingTaxClass = parseInt(shippingTaxClass, 10);
            if (shippingTaxClass > 0) {
              const taxClass = await select()
                .from('tax_class')
                .where('tax_class_id', '=', shippingTaxClass)
                .load(pool);

              if (!taxClass) {
                return this.getData('shipping_fee_excl_tax');
              } else {
                const shippingAddress = this.getData('shippingAddress');
                const percentage = getTaxPercent(
                  await getTaxRates(
                    shippingTaxClass,
                    shippingAddress.country,
                    shippingAddress.province,
                    shippingAddress.postcode
                  )
                );

                const taxAmount = calculateTaxAmount(
                  percentage,
                  this.getData('shipping_fee_excl_tax'),
                  1
                );
                return this.getData('shipping_fee_excl_tax') + taxAmount;
              }
            } else {
              const items = this.getItems();
              let percentage = 0;
              if (shippingTaxClass === 0) {
                // Highest tax rate
                items.forEach((item) => {
                  if (item.getData('tax_percent') > percentage) {
                    percentage = item.getData('tax_percent');
                  }
                });
              } else {
                items.forEach((item) => {
                  // Protional allocation
                  const itemTotal =
                    item.getData('final_price') * item.getData('qty');
                  percentage +=
                    (itemTotal / this.getData('sub_total')) *
                    item.getData('tax_percent');
                });
              }
              const taxAmount = calculateTaxAmount(
                percentage,
                this.getData('shipping_fee_excl_tax'),
                1
              );
              return this.getData('shipping_fee_excl_tax') + taxAmount;
            }
          }
        }
      ],
      dependencies: ['shipping_fee_excl_tax', 'sub_total']
    },
    {
      key: 'billing_address_id',
      resolvers: [
        async function resolver() {
          return this.dataSource.billing_address_id;
        }
      ],
      dependencies: ['cart_id']
    },
    {
      key: 'billingAddress',
      resolvers: [
        async function resolver() {
          if (!this.getData('billing_address_id')) {
            return undefined;
          } else {
            return {
              ...(await select()
                .from('cart_address')
                .where(
                  'cart_address_id',
                  '=',
                  this.getData('billing_address_id')
                )
                .load(pool))
            };
          }
        }
      ],
      dependencies: ['billing_address_id']
    },
    {
      key: 'payment_method',
      resolvers: [
        async function resolver() {
          this.errors.payment_method = 'Payment method is required';
          // Each payment method should handle this field
          // by returning the payment method code and remove this error if the payment method is valid
        }
      ]
    },
    {
      key: 'payment_method_name',
      resolvers: [
        async function resolver() {
          // TODO: This field should be handled by each of payment method
          return this.dataSource.payment_method_name;
        }
      ],
      dependencies: ['payment_method']
    },
    {
      key: 'items',
      resolvers: [
        async function resolver() {
          const items = [];
          if (this.dataSource.items) {
            await Promise.all(
              this.dataSource.items.map(async (item) => {
                // If this is just new added item, add it to the list
                if (
                  !/^\d+$/.test(item.getData('cart_item_id')) &&
                  Object.keys(item.errors).length === 0
                ) {
                  items.push(item);
                } else if (/^\d+$/.test(item.getData('cart_item_id'))) {
                  // If the item is not build
                  if (item.dataSource.product === undefined) await item.build();
                  items.push(item);
                }
              })
            );
          } else {
            const query = select();
            const list = await query
              .from('cart_item')
              .where('cart_id', '=', this.getData('cart_id'))
              .execute(pool);

            await Promise.all(
              list.map(async (i) => {
                const item = new Item(i);
                await item.build();
                if (!item.getData('product_id')) {
                  await del('cart_item')
                    .where('cart_item_id', '=', i.cart_item_id)
                    .execute(pool);
                  return;
                }
                let flag = true;
                items.forEach((_item) => {
                  if (
                    _item.getData('product_sku') ===
                      item.getData('product_sku') &&
                    isEqualWith(
                      _item.getData('product_custom_options'),
                      item.getData('product_custom_options')
                    )
                  ) {
                    _item.setData(
                      'qty',
                      _item.getData('qty') + item.getData('qty')
                    );
                    flag = false;
                  }
                });
                if (flag === false) {
                  await del('cart_item')
                    .where('cart_item_id', '=', i.cart_item_id)
                    .execute(pool);
                } else items.push(item);
              })
            );
            this.dataSource.items = items;
          }

          return items;
        }
      ],
      dependencies: ['cart_id']
    }
  ];

  constructor(data = {}) {
    super();
    this.dataSource = data;
    this.prepareFields();
  }

  /**
   * @returns {Array<Item>}
   */
  getItems() {
    return this.getData('items') ?? [];
  }

  async addItem(data) {
    const item = new Item(data);
    await item.build();
    if (Object.keys(item.errors).length > 0) {
      // Get the first error from the item.errors object
      throw new Error(Object.values(item.errors)[0]);
    } else {
      let items = this.getItems();
      let duplicateItem;
      for (let i = 0; i < items.length; i += 1) {
        if (
          items[i].getData('product_sku') === item.getData('product_sku') &&
          isEqualWith(
            items[i].getData('product_custom_options'),
            item.getData('product_custom_options')
          )
        ) {
          // eslint-disable-next-line no-await-in-loop
          await items[i].setData(
            'qty',
            item.getData('qty') + items[i].getData('qty')
          );
          if (Object.keys(items[i].errors).length > 0) {
            throw new Error(Object.values(items[i].errors)[0]);
          }
          duplicateItem = items[i];
        }
      }

      if (!duplicateItem) {
        items = items.concat(item);
      }
      await this.setData('items', items);
      return duplicateItem || item;
    }
  }

  /**
   * @param {string||int} id
   * @returns {Item}
   * @throws {Error}
   */
  async removeItem(id) {
    const items = this.getItems();
    const item = this.getItem(id);
    const newItems = items.filter((i) => i.getData('uuid') !== id);
    if (item) {
      await this.setData('items', newItems);
      return item;
    } else {
      throw new Error('Item not found');
    }
  }

  getItem(id) {
    const items = this.getItems();
    return items.find((item) => item.getData('uuid') === id);
  }

  hasItemError() {
    const items = this.getItems();
    let flag = false;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].hasError()) {
        flag = true;
        break;
      }
    }

    return flag;
  }

  hasError() {
    return super.hasError() || this.hasItemError();
  }

  export() {
    const data = {};
    this.constructor.fields.forEach((f) => {
      if (f.key !== 'items') {
        data[f.key] = this.data[f.key];
      } else {
        const items = this.getItems();
        data[f.key] = items.map((item) => item.export());
      }
    });

    return data;
  }
};
