const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { v4: uuidv4 } = require('uuid');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { toPrice } = require('../toPrice');
const {
  calculateTaxAmount
} = require('../../../tax/services/calculateTaxAmount');

module.exports.registerCartItemBaseFields = function registerCartItemBaseFields(
  fields
) {
  const newFields = fields.concat([
    {
      key: 'cart_item_id',
      resolvers: [
        async function resolver() {
          return this.getData('cart_item_id');
        }
      ]
    },
    {
      key: 'uuid',
      resolvers: [
        async function resolver() {
          return this.getData('uuid') ?? uuidv4();
        }
      ]
    },
    {
      key: 'cart_id',
      resolvers: [
        async function resolver() {
          const cart = this.getCart();
          return cart.getData('cart_id');
        }
      ],
      dependencies: ['cart_item_id']
    },
    {
      key: 'product_id',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          if (product.status === false) {
            this.setError('product_id', 'This product is not available');
          }
          return product.product_id;
        }
      ]
    },
    {
      key: 'product_uuid',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return product.uuid;
        }
      ]
    },
    {
      key: 'product_sku',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return product.sku;
        }
      ]
    },
    {
      key: 'group_id',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return parseInt(product.group_id, 10) ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'category_id',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return product.category_id ? parseInt(product.category_id, 10) : null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'product_name',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return product.name ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'thumbnail',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          if (product.thumb_image) {
            return product.thumb_image;
          } else {
            return null;
          }
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'product_weight',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return parseFloat(product.weight) ?? null;
        }
      ],
      dependencies: ['product_id']
    },
    {
      key: 'tax_class_id',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return product.tax_class ?? null;
        }
      ],
      dependencies: ['product_id']
    },

    {
      key: 'product_price',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          const catalogPriceInclTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );
          if (catalogPriceInclTax) {
            const taxAmount = calculateTaxAmount(
              this.getData('tax_percent'),
              product.price,
              1,
              true
            );
            return toPrice(product.price - taxAmount);
          } else {
            return toPrice(product.price);
          }
        }
      ],
      dependencies: ['product_id', 'tax_percent']
    },
    {
      key: 'tax_amount_before_discount',
      resolvers: [
        async function resolver() {
          const catalogPriceInclTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );
          if (catalogPriceInclTax) {
            return calculateTaxAmount(
              this.getData('tax_percent'),
              this.getData('product_price_incl_tax'),
              this.getData('qty'),
              true
            );
          } else {
            return calculateTaxAmount(
              this.getData('tax_percent'),
              this.getData('product_price'),
              this.getData('qty')
            );
          }
        }
      ],
      dependencies: [
        'tax_percent',
        'product_price',
        'product_price_incl_tax',
        'qty'
      ]
    },
    {
      key: 'tax_amount',
      resolvers: [
        async function resolver() {
          const priceIncludingTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );
          const discountAmount = this.getData('discount_amount');
          const discountAmountPerUnit = discountAmount / this.getData('qty');
          const finalPricePerUnit = priceIncludingTax
            ? this.getData('final_price_incl_tax') - discountAmountPerUnit
            : this.getData('final_price') - discountAmountPerUnit;
          return calculateTaxAmount(
            this.getData('tax_percent'),
            finalPricePerUnit,
            this.getData('qty'),
            priceIncludingTax
          );
        }
      ],
      dependencies: [
        'discount_amount',
        'tax_percent',
        'final_price',
        'final_price_incl_tax',
        'qty'
      ]
    },
    {
      key: 'product_price_incl_tax',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          const catalogPriceInclTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );

          if (catalogPriceInclTax) {
            return toPrice(product.price);
          } else {
            const taxAmount = calculateTaxAmount(
              this.getData('tax_percent'),
              this.getData('product_price'),
              1
            );
            return toPrice(this.getData('product_price') + taxAmount);
          }
        }
      ],
      dependencies: ['product_price', 'tax_percent']
    },
    {
      key: 'qty',
      resolvers: [
        async function resolver() {
          const triggeredField = this.getTriggeredField();
          const requestedValue = this.getRequestedValue();
          const qty =
            triggeredField === 'qty' ? requestedValue : this.getData('qty');
          const product = await this.getProduct();
          if (product.manage_stock === true && product.qty < 1) {
            this.setError('qty', 'This item is out of stock');
          } else if (product.manage_stock === true && product.qty < qty) {
            this.setError('qty', 'We do not have enough stock');
          }

          return parseInt(qty, 10) ?? null;
        }
      ]
    },
    {
      key: 'final_price',
      resolvers: [
        async function resolver() {
          return this.getData('product_price'); // TODO This price should include the custom option price
        }
      ],
      dependencies: ['product_price']
    },
    {
      key: 'final_price_incl_tax',
      resolvers: [
        async function resolver() {
          return this.getData('product_price_incl_tax');
        }
      ],
      dependencies: ['product_price_incl_tax']
    },
    {
      key: 'line_total',
      resolvers: [
        async function resolver() {
          return this.getData('final_price') * this.getData('qty');
        }
      ],
      dependencies: ['final_price', 'qty']
    },
    {
      key: 'line_total_incl_tax',
      resolvers: [
        async function resolver() {
          return this.getData('final_price_incl_tax') * this.getData('qty');
        }
      ],
      dependencies: ['final_price_incl_tax', 'qty']
    },
    {
      key: 'variant_group_id',
      resolvers: [
        async function resolver() {
          const product = await this.getProduct();
          return product.variant_group_id ?? null;
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
  ]);
  return newFields;
};
