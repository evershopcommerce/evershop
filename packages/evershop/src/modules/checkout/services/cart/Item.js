const config = require('config');
const { select } = require('@evershop/postgres-query-builder');
const fs = require('fs');
const path = require('path');
const uniqid = require('uniqid');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
/* eslint-disable no-underscore-dangle */
const { DataObject } = require('./DataObject');
const { toPrice } = require('../toPrice');
const { getSetting } = require('../../../setting/services/setting');
const { getTaxPercent } = require('../../../tax/services/getTaxPercent');
const { getTaxRates } = require('../../../tax/services/getTaxRates');
const {
  calculateTaxAmount
} = require('../../../tax/services/calculateTaxAmount');

module.exports.Item = class Item extends DataObject {
  static fields = [
    {
      key: 'cart_item_id',
      resolvers: [
        async function resolver() {
          return this.dataSource.cart_item_id ?? uniqid();
        }
      ]
    },
    {
      key: 'uuid',
      resolvers: [
        async function resolver() {
          return this.dataSource.uuid ?? uuidv4();
        }
      ]
    },
    {
      key: 'cart_id',
      resolvers: [
        async function resolver() {
          return this.dataSource.cart_id;
        }
      ]
    },
    {
      key: 'product_id',
      resolvers: [
        async function resolver() {
          const query = select().from('product');
          query
            .leftJoin('product_description', 'des')
            .on(
              'product.product_id`',
              '=',
              'des.product_description_product_id'
            );
          query
            .innerJoin('product_inventory')
            .on(
              'product_inventory.product_inventory_product_id',
              '=',
              'product.product_id'
            );

          const product = await query
            .where('product_id', '=', this.dataSource.product_id)
            .load(pool);
          if (!product || product.status === 0) {
            this.errors.product_id = 'Requested product does not exist';
            this.dataSource = { ...this.dataSource, product: {} };
            return null;
          }
          this.dataSource = { ...this.dataSource, product };
          return this.dataSource.product_id;
        }
      ]
    },
    {
      key: 'product_sku',
      resolvers: [
        async function resolver() {
          return this.dataSource.product.sku ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'group_id',
      resolvers: [
        async function resolver() {
          return parseInt(this.dataSource.product.group_id, 10) ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'category_id',
      resolvers: [
        async function resolver() {
          return parseInt(this.dataSource.product.category_id, 10) ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'product_name',
      resolvers: [
        async function resolver() {
          return this.dataSource.product.name ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'thumbnail',
      resolvers: [
        async function resolver() {
          if (this.dataSource.product.image) {
            const thumb = this.dataSource.product.image.replace(
              /.([^.]*)$/,
              '-thumb.$1'
            );
            return fs.existsSync(path.join(CONSTANTS.MEDIAPATH, thumb))
              ? `/assets${thumb}`
              : `/assets/theme/frontStore${config.get(
                  'catalog.product.image.placeHolder'
                )}`;
          } else {
            return `/assets/theme/frontStore${config.get(
              'catalog.product.image.placeHolder'
            )}`;
          }
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'product_weight',
      resolvers: [
        async function resolver() {
          return parseFloat(this.dataSource.product.weight) ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'product_price',
      resolvers: [
        async function resolver() {
          return toPrice(this.dataSource.product.price);
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'product_price_incl_tax',
      resolvers: [
        async function resolver() {
          const taxAmount = calculateTaxAmount(
            this.getData('tax_percent'),
            this.getData('product_price'),
            1
          );
          return toPrice(this.getData('product_price')) + taxAmount;
        }
      ],
      dependencies: ['product_price', 'tax_percent']
    },
    {
      key: 'qty',
      resolvers: [
        async function resolver() {
          if (
            this.dataSource.product.product_id &&
            this.dataSource.product.manage_stock === true &&
            this.dataSource.product.qty < 1
          ) {
            this.errors.qty = 'This item is out of stock';
          } else if (
            this.dataSource.product.product_id &&
            this.dataSource.product.manage_stock === true &&
            this.dataSource.product.qty < this.dataSource.qty
          )
            this.errors.qty = 'We do not have enough stock';
          return parseInt(this.dataSource.qty, 10) ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'final_price',
      resolvers: [
        async function resolver() {
          return toPrice(this.getData('product_price')); // TODO This price should include the custom option price
        }
      ],
      dependencies: ['product_price']
    },
    {
      key: 'final_price_incl_tax',
      resolvers: [
        async function resolver() {
          const taxAmount = calculateTaxAmount(
            this.getData('tax_percent'),
            this.getData('final_price'),
            1
          );
          return toPrice(this.getData('final_price')) + taxAmount;
        }
      ],
      dependencies: ['final_price', 'tax_percent']
    },
    {
      key: 'total',
      resolvers: [
        async function resolver() {
          return toPrice(
            this.getData('final_price') * this.getData('qty') +
              this.getData('tax_amount')
          );
        }
      ],
      dependencies: ['final_price', 'qty', 'tax_amount']
    },
    {
      key: 'tax_class_id',
      resolvers: [
        async function resolver() {
          return this.dataSource.product.tax_class ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'tax_percent',
      resolvers: [
        async function resolver() {
          if (!this.getData('tax_class_id')) {
            return 0;
          } else if (!this.getData('cart_id')) {
            return 0;
          } else {
            const taxClass = await select()
              .from('tax_class')
              .where('tax_class_id', '=', this.getData('tax_class_id'))
              .load(pool);
            if (!taxClass) {
              return 0;
            } else {
              const baseCalculationAddress = await getSetting(
                'baseCalculationAddress',
                'shippingAddress'
              );
              if (baseCalculationAddress === 'storeAddress') {
                const percentage = getTaxPercent(
                  await getTaxRates(
                    this.getData('tax_class_id'),
                    await getSetting('storeCountry', null),
                    await getSetting('storeProvince', null),
                    await getSetting('storePostalCode', null)
                  )
                );
                return percentage;
              } else {
                const cart = await select()
                  .from('cart')
                  .where('cart_id', '=', this.getData('cart_id'))
                  .load(pool);

                const addressId =
                  baseCalculationAddress === 'billingAddress'
                    ? cart.billing_address_id
                    : cart.shipping_address_id;

                if (!addressId) {
                  return 0;
                } else {
                  const address = await select()
                    .from('cart_address')
                    .where('cart_address_id', '=', addressId)
                    .load(pool);
                  if (!address) {
                    return 0;
                  } else {
                    const percentage = getTaxPercent(
                      await getTaxRates(
                        this.getData('tax_class_id'),
                        address.country,
                        address.province,
                        address.postcode
                      )
                    );
                    return percentage;
                  }
                }
              }
            }
          }
        }
      ],
      dependencies: ['cart_id', 'tax_class_id']
    },
    {
      key: 'tax_amount',
      resolvers: [
        async function resolver() {
          const discountAmount = this.getData('discount_amount');
          const finalPrice = this.getData('final_price');

          // The discount amount is total (all quantity), we need to Get the final price after discount per unit
          const finalPricePerUnit =
            finalPrice - discountAmount / this.getData('qty');
          return calculateTaxAmount(
            this.getData('tax_percent'),
            finalPricePerUnit,
            this.getData('qty')
          );
        }
      ],
      dependencies: ['tax_percent', 'final_price', 'qty', 'discount_amount']
    },
    {
      key: 'variant_group_id',
      resolvers: [
        async function resolver() {
          return this.dataSource.product.variant_group_id ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'variant_options',
      resolvers: [
        async function resolver() {
          if (this.dataSource.product.variant_group_id) {
            const group = await select('attribute_one')
              .select('attribute_two')
              .select('attribute_three')
              .select('attribute_four')
              .select('attribute_five')
              .from('variant_group')
              .where(
                'variant_group_id',
                '=',
                this.dataSource.product.variant_group_id
              )
              .load(pool);
            if (!group) return null;
            else {
              const query = select('a.attribute_code')
                .select('a.attribute_name')
                .select('a.attribute_id')
                .select('o.option_id')
                .select('o.option_text')
                .from('attribute', 'a');
              query
                .innerJoin('product_attribute_value_index', 'o')
                .on('a.attribute_id', '=', 'o.attribute_id');
              query
                .where('o.product_id', '=', this.dataSource.product.product_id)
                .and(
                  'a.attribute_id',
                  'IN',
                  Object.values(group).filter((v) => v != null)
                );

              return JSON.stringify(await query.execute(pool));
            }
          } else {
            return null;
          }
        }
      ],
      dependencies: ['variant_group_id']
    },
    {
      key: 'product_custom_options',
      resolvers: [
        async function resolver() {
          return null; // TODO: Add custom options
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'productUrl',
      resolvers: [
        async function resolver() {
          if (!this.getData('product_id')) {
            return null;
          }
          const urlRewrite = await select()
            .from('url_rewrite')
            .where('entity_uuid', '=', this.dataSource.product.uuid)
            .and('entity_type', '=', 'product')
            .load(pool);
          if (!urlRewrite) {
            return buildUrl('productView', {
              uuid: this.dataSource.product.uuid
            });
          } else {
            return urlRewrite.request_path;
          }
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'removeUrl',
      resolvers: [
        async function resolver() {
          if (this.getData('cart_item_id')) {
            return buildUrl('removeMineCartItem', {
              item_id: this.getData('uuid')
            });
          } else {
            return undefined;
          }
        }
      ],
      dependencies: ['cart_item_id', 'uuid']
    }
  ];

  constructor(data = {}) {
    super();
    this.dataSource = data;
    this.prepareFields();
  }

  getId() {
    return this.getData('uuid');
  }
};
