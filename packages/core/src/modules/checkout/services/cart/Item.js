const config = require('config');
const { select } = require('@evershop/mysql-query-builder');
const fs = require('fs');
const path = require('path');
const { pool } = require('../../../../lib/mysql/connection');
const { CONSTANTS } = require('../../../../lib/helpers');
const { buildUrl } = require('../../../../lib/router/buildUrl');
/* eslint-disable no-underscore-dangle */
const { DataObject } = require('./DataObject');
const { toPrice } = require('../toPrice');
const uniqid = require('uniqid');

module.exports.Item = class Item extends DataObject {
  static fields = [
    {
      key: 'cart_item_id',
      async resolver() {
        return this.dataSource.cart_item_id ?? uniqid();
      }
    },
    {
      key: 'product_id',
      async resolver() {
        const query = select()
          .from('product');
        query.leftJoin('product_description', 'des')
          .on('product.`product_id`', '=', 'des.`product_description_product_id`');
        const product = await query.where('product_id', '=', this.dataSource.product_id)
          .load(pool);
        if (!product || product.status === 0) {
          this.error = 'Requested product does not exist';
          this.dataSource = { ...this.dataSource, product: {} };
          return null;
        }
        this.dataSource = { ...this.dataSource, product };
        return this.dataSource.product_id;
      }
    },
    {
      key: 'product_sku',
      async resolver() {
        return this.dataSource.product.sku ?? null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'group_id',
      async resolver() {
        return parseInt(this.dataSource.product.group_id) ?? null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'product_name',
      async resolver() {
        return this.dataSource.product.name ?? null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'thumbnail',
      async resolver() {
        if (this.dataSource.product.image) {
          const thumb = this.dataSource.product.image.replace(/.([^.]*)$/, '-thumb.$1');
          return fs.existsSync(path.join(CONSTANTS.MEDIAPATH, thumb)) ? `/assets${thumb}` : `/assets/theme/frontStore${config.get('catalog.product.image.placeHolder')}`;
        } else {
          return `/assets/theme/frontStore${config.get('catalog.product.image.placeHolder')}`;
        }
      },
      dependencies: ['product_id']
    },
    {
      key: 'product_weight',
      async resolver() {
        return parseFloat(this.dataSource.product.weight) ?? null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'product_price',
      async resolver() {
        return toPrice(this.dataSource.product.price);
      },
      dependencies: ['product_id']
    },
    {
      key: 'product_price_incl_tax',
      async resolver() {
        return toPrice(this.getData('product_price')); // TODO: Tax will be added in tax module
      },
      dependencies: ['product_price']
    },
    {
      key: 'qty',
      async resolver() {
        if (
          this.dataSource.product.product_id
          && this.dataSource.product.manage_stock === 1
          && this.dataSource.product.qty < 1
        ) {
          this.error = 'This item is out of stock';
        } else if (
          this.dataSource.product.product_id
          && this.dataSource.product.manage_stock === 1
          && this.dataSource.product.qty < this.dataSource.qty
        ) this.error = 'We do not have enough stock';

        return parseInt(this.dataSource.qty, 10) ?? null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'final_price',
      async resolver() {
        return toPrice(this.getData('product_price')); // TODO This price should include the custom option price
      },
      dependencies: ['product_price']
    },
    {
      key: 'final_price_incl_tax',
      async resolver() {
        return toPrice(this.getData('final_price'));
      },
      dependencies: ['final_price', 'tax_amount']
    },
    {
      key: 'total',
      async resolver() {
        return toPrice(this.getData('final_price') * this.getData('qty') + this.getData('tax_amount'));
      },
      dependencies: ['final_price', 'qty', 'tax_amount']
    },
    {
      key: 'tax_percent',
      async resolver() {
        return 0; // Will be added later
      }
    },
    {
      key: 'tax_amount',
      async resolver() {
        return 0; // Will be added later
      },
      dependencies: []
    },
    {
      key: 'variant_group_id',
      async resolver() {
        return this.dataSource.product.variant_group_id ?? null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'variant_options',
      async resolver() {
        if (this.dataSource.product.variant_group_id) {
          const group = await select('attribute_one')
            .select('attribute_two')
            .select('attribute_three')
            .select('attribute_four')
            .select('attribute_five')
            .from('variant_group')
            .where('variant_group_id', '=', this.dataSource.product.variant_group_id)
            .load(pool);
          if (!group) return null;
          else {
            const query = select('a.`attribute_code`')
              .select('a.`attribute_name`')
              .select('a.`attribute_id`')
              .select('o.`option_id`')
              .select('o.`option_text`')
              .from('attribute', 'a');
            query.innerJoin('product_attribute_value_index', 'o').on('a.`attribute_id`', '=', 'o.`attribute_id`');
            query.where('o.`product_id`', '=', this.dataSource.product.product_id)
              .and('a.`attribute_id`', 'IN', Object.values(group).filter((v) => v != null));

            return JSON.stringify(await query.execute(pool));
          }
        } else {
          return null;
        }
      },
      dependencies: ['variant_group_id']
    },
    {
      key: 'product_custom_options',
      async resolver() {
        return null; // TODO: Add custom options
      },
      dependencies: ['product_id']
    },
    {
      key: 'productUrl',
      async resolver() {
        return this.getData('product_id') ? buildUrl('productView', { url_key: this.dataSource.product.url_key }) : null;
      },
      dependencies: ['product_id']
    },
    {
      key: 'removeUrl',
      async resolver() {
        if (this.getData('cart_item_id')) {
          return buildUrl('cartItemRemove', { id: this.getData('cart_item_id') });
        } else {
          return undefined;
        }
      },
      dependencies: ['cart_item_id']
    }
  ];

  constructor(data = {}) {
    super();
    this.dataSource = data;

    this.prepareFields();
    this.error = undefined;
  }

  getId() {
    return this.getData('cart_item_id');
  }
}
