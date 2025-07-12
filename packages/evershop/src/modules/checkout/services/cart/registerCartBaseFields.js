import { select } from '@evershop/postgres-query-builder';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { normalizePort } from '../../../../bin/lib/normalizePort.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getSetting } from '../../../../modules/setting/services/setting.js';
import { calculateTaxAmount } from '../../../../modules/tax/services/calculateTaxAmount.js';
import { getTaxPercent } from '../../../../modules/tax/services/getTaxPercent.js';
import { getTaxRates } from '../../../../modules/tax/services/getTaxRates.js';
import { getAvailablePaymentMethods } from '../getAvailablePaymentMethos.js';
import { toPrice } from '../toPrice.js';

export function registerCartBaseFields(fields) {
  const newFields = fields.concat([
    {
      key: 'cart_id',
      resolvers: [
        async function resolver() {
          return this.getData('cart_id');
        }
      ]
    },
    {
      key: 'uuid',
      resolvers: [
        function resolver() {
          const uuid = this.getData('uuid');
          const key = uuidv4();
          // Replace all '-' with '' from key
          return uuid || key.replace(/-/g, '');
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
        async function resolver(ip) {
          return ip;
        }
      ]
    },
    {
      key: 'sid',
      resolvers: [
        async function resolver(sid) {
          return sid;
        }
      ]
    },
    {
      key: 'status',
      resolvers: [
        async function resolver() {
          return 1;
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

          return toPrice(taxAmount);
        }
      ],
      dependencies: ['items', 'shipping_tax_amount']
    },
    {
      key: 'tax_amount_before_discount',
      resolvers: [
        async function resolver() {
          // Sum all tax amount from items
          let taxAmount = 0;
          const items = this.getItems();
          items.forEach((i) => {
            taxAmount += i.getData('tax_amount_before_discount');
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
            total += i.getData('line_total');
          });
          return toPrice(total);
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'sub_total_incl_tax',
      resolvers: [
        async function resolver() {
          let total = 0;
          const items = this.getItems();
          items.forEach((i) => {
            total += i.getData('line_total_incl_tax');
          });
          return toPrice(total);
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'shipping_zone_id',
      resolvers: [
        async function resolver(shippingZoneId) {
          if (!shippingZoneId) {
            return null;
          } else {
            const zone = await select()
              .from('shipping_zone')
              .where('shipping_zone_id', '=', shippingZoneId)
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
        async function resolver(shippingAddressId) {
          if (!shippingAddressId || !this.getData('shipping_zone_id')) {
            return null;
          } else {
            // validate country and province with shipping zone
            const shippingAddress = await select()
              .from('cart_address')
              .where('cart_address_id', '=', shippingAddressId)
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
        async function resolver(shippingMethod) {
          if (!shippingMethod) {
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
            .where('uuid', '=', shippingMethod)
            .and('is_enabled', '=', true)
            .and(
              'shipping_zone_method.zone_id',
              '=',
              this.getData('shipping_zone_id')
            );
          const method = await shippingMethodQuery.load(pool);
          if (!method) {
            return null;
          } else {
            // Validate shipping method using max weight and max price, min weight and min price
            const { max, min } = method;
            const total_weight = this.getData('total_weight');
            const sub_total = this.getData('sub_total');
            let flag = false;

            if (method.condition_type === 'weight') {
              if (
                total_weight >= toPrice(min) &&
                total_weight <= toPrice(max)
              ) {
                flag = true;
              }
            }
            if (method.condition_type === 'price') {
              if (sub_total >= toPrice(min) && sub_total <= toPrice(max)) {
                flag = true;
              }
            }
            if (method.condition_type === null) {
              flag = true;
            }
            if (flag === false) {
              this.setError('shipping_method', 'Shipping method is invalid');
              return null;
            } else {
              return method.uuid;
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
      key: 'shipping_fee_draft',
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
              .where('uuid', '=', this.getData('shipping_method'))
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
              const port = normalizePort();
              let api = `http://localhost:${port}`;
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
                this.setError('shipping_fee_excl_tax', response.data.message);
                return 0;
              }
            } else if (shippingMethod.weight_based_cost) {
              const totalWeight = this.getData('total_weight');
              const weightBasedCost = shippingMethod.weight_based_cost
                .map(({ min_weight, cost }) => ({
                  min_weight: parseFloat(min_weight),
                  cost: toPrice(cost)
                }))
                .sort((a, b) => a.min_weight - b.min_weight);

              let cost = 0;
              for (let i = 0; i < weightBasedCost.length; i += 1) {
                if (totalWeight >= weightBasedCost[i].min_weight) {
                  cost = weightBasedCost[i].cost;
                }
              }
              return toPrice(cost);
            } else if (shippingMethod.price_based_cost) {
              const subTotal = this.getData('sub_total');
              const priceBasedCost = shippingMethod.price_based_cost
                .map(({ min_price, cost }) => ({
                  min_price: toPrice(min_price),
                  cost: toPrice(cost)
                }))
                .sort((a, b) => a.min_price - b.min_price);
              let cost = 0;
              for (let i = 0; i < priceBasedCost.length; i += 1) {
                if (subTotal >= priceBasedCost[i].min_price) {
                  cost = priceBasedCost[i].cost;
                }
              }
              return toPrice(cost);
            } else {
              this.setError(
                'shipping_fee_excl_tax',
                'Could not calculate shipping fee'
              );
              return 0;
            }
          }
        }
      ],
      dependencies: ['shipping_method']
    },
    {
      key: 'shipping_fee_tax_percent',
      resolvers: [
        async function resolver() {
          if (!this.getData('shipping_method')) {
            return null;
          }
          let shippingTaxClass = await getSetting(
            'defaultShippingTaxClassId',
            ''
          );

          // -1: Protional allocation based on the items
          // 0: Highest tax rate based on the items
          if (shippingTaxClass === '') {
            return 0;
          } else {
            shippingTaxClass = parseInt(shippingTaxClass, 10);
            if (shippingTaxClass > 0) {
              const taxClass = await select()
                .from('tax_class')
                .where('tax_class_id', '=', shippingTaxClass)
                .load(pool);

              if (!taxClass) {
                return 0;
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
                return percentage;
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
              return percentage;
            }
          }
        }
      ],
      dependencies: ['sub_total', 'shipping_method']
    },
    {
      key: 'shipping_tax_amount',
      resolvers: [
        async function resolver() {
          const priceIncludingTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );
          if (this.getData('shipping_fee_draft') === 0) {
            return 0;
          }
          const shippingFeeTax = calculateTaxAmount(
            this.getData('shipping_fee_tax_percent'),
            this.getData('shipping_fee_draft'),
            1,
            priceIncludingTax
          );
          return toPrice(shippingFeeTax);
        }
      ],
      dependencies: ['shipping_fee_draft', 'shipping_fee_tax_percent']
    },
    {
      key: 'shipping_fee_excl_tax',
      resolvers: [
        async function resolver() {
          const priceIncludingTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );
          if (this.getData('shipping_fee_draft') === 0) {
            return 0;
          }
          if (priceIncludingTax === false) {
            return this.getData('shipping_fee_draft');
          } else {
            const shippingFeeTax = calculateTaxAmount(
              this.getData('shipping_fee_tax_percent'),
              this.getData('shipping_fee_draft'),
              1,
              priceIncludingTax
            );
            return toPrice(this.getData('shipping_fee_draft') - shippingFeeTax);
          }
        }
      ],
      dependencies: ['shipping_fee_tax_percent', 'shipping_fee_draft']
    },
    {
      key: 'shipping_fee_incl_tax',
      resolvers: [
        async function resolver() {
          const priceIncludingTax = getConfig(
            'pricing.tax.price_including_tax',
            false
          );
          if (this.getData('shipping_fee_draft') === 0) {
            return 0;
          }
          if (priceIncludingTax === true) {
            return this.getData('shipping_fee_draft');
          } else {
            return toPrice(
              this.getData('shipping_fee_excl_tax') +
                this.getData('shipping_tax_amount')
            );
          }
        }
      ],
      dependencies: [
        'shipping_fee_excl_tax',
        'shipping_tax_amount',
        'shipping_fee_draft'
      ]
    },
    {
      key: 'shipping_note',
      resolvers: [
        async function resolver(note) {
          return note;
        }
      ]
    },
    {
      key: 'total_tax_amount', // This field should contain the total tax amount of the cart including tax of items and shipping fee
      resolvers: [
        function resolver() {
          return toPrice(
            this.getData('tax_amount') + this.getData('shipping_tax_amount')
          );
        }
      ],
      dependencies: ['tax_amount', 'shipping_tax_amount']
    },
    {
      key: 'billing_address_id',
      resolvers: [
        async function resolver(billingAddressId) {
          return billingAddressId;
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
        async function resolver(paymentMethod) {
          const methods = await getAvailablePaymentMethods();
          if (
            paymentMethod &&
            methods.map((m) => m.methodCode).includes(paymentMethod)
          ) {
            this.setError('payment_method', undefined);
            return paymentMethod;
          } else if (
            paymentMethod &&
            !methods.map((m) => m.methodCode).includes(paymentMethod)
          ) {
            this.setError(
              'payment_method',
              `Payment method ${paymentMethod} is not available`
            );
            return null;
          } else if (paymentMethod === null) {
            this.setError('payment_method', 'Payment method is required');
            return null;
          }
        }
      ]
    },
    {
      key: 'payment_method_name',
      resolvers: [
        async function resolver(methodName) {
          // TODO: This field should be handled by each of payment method
          return methodName;
        }
      ],
      dependencies: ['payment_method']
    },
    {
      key: 'items',
      resolvers: [
        async function resolver() {
          const triggeredField = this.getTriggeredField();
          const requestedValue = this.getRequestedValue();
          const items = [];
          if (triggeredField === 'items') {
            requestedValue.forEach((item) => {
              // If this is just new added item, add it to the list
              if (!item.getId() && !item.hasError()) {
                items.push(item);
              } else {
                items.push(item);
              }
            });
            return items;
          } else {
            return this.getData('items');
          }
        }
      ],
      dependencies: ['cart_id', 'currency']
    }
  ]);
  return newFields;
}
