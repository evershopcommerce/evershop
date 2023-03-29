/* eslint-disable no-underscore-dangle */
const isEqualWith = require('lodash/isEqualWith');
const { select, del } = require('@evershop/postgres-query-builder');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { DataObject } = require('./DataObject');
const { Item } = require('./Item');
const { toPrice } = require('../toPrice');
const { getSetting } = require('../../../setting/services/setting');
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
          const currency = await getSetting('storeCurrency', 'USD');
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
          return 0; // Will be added later
        }
      ],
      dependencies: []
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
          return this.getData('sub_total');
        }
      ],
      dependencies: ['sub_total']
    },
    {
      key: 'shipping_address_id',
      resolvers: [
        async function resolver() {
          return this.dataSource.shipping_address_id;
        }
      ],
      dependencies: ['cart_id']
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
          // TODO: This field should be handled by each of shipping method
          return this.dataSource.shipping_method;
        }
      ],
      dependencies: ['shipping_address_id']
    },
    {
      key: 'shipping_method_name',
      resolvers: [
        async function resolver() {
          // TODO: This field should be handled by each of shipping method
          return this.dataSource.shipping_method_name;
        }
      ],
      dependencies: ['shipping_method']
    },
    {
      key: 'shipping_fee_excl_tax',
      resolvers: [
        async function resolver() {
          return 0; // TODO: This field should be handled by each of shipping method
        }
      ],
      dependencies: ['shipping_method']
    },
    {
      key: 'shipping_fee_incl_tax',
      resolvers: [
        async function resolver() {
          return 0; // TODO: This field should be handled by each of shipping method
        }
      ],
      dependencies: ['shipping_method']
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
                  item.error === undefined
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
    if (item.error) {
      throw new Error(item.error);
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
          if (items[i].error) {
            throw new Error(items[i].error);
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
