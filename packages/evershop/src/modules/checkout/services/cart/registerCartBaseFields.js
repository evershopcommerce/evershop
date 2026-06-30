import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { getValueSync } from '../../../../lib/util/registry.js';
import { validateAddress } from '../../../../modules/customer/services/index.js';
import {
  getSetting,
  getStoreCurrency
} from '../../../../modules/setting/services/setting.js';
import { calculateTaxAmount } from '../../../../modules/tax/services/calculateTaxAmount.js';
import { getTaxPercent } from '../../../../modules/tax/services/getTaxPercent.js';
import { getTaxRates } from '../../../../modules/tax/services/getTaxRates.js';
import { getAvailablePaymentMethods } from '../getAvailablePaymentMethods.js';
import { computeFingerprintFromCart } from '../shipping/computeFingerprint.js';
import { getShippingProvider } from '../shipping/registry.js';
import { resolveShippingQuote } from '../shipping/resolveShippingQuote.js';
import { toPrice } from '../toPrice.js';
import { buildDefaultParcels } from './packing.js';

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
        function resolver() {
          return getStoreCurrency();
        }
      ]
    },
    {
      key: 'created_at',
      resolvers: [
        async function resolver() {
          const createdAt = this.getData('created_at');
          return createdAt;
        }
      ],
      dependencies: ['cart_id']
    },
    {
      key: 'updated_at',
      resolvers: [
        async function resolver() {
          const updatedAt = this.getData('updated_at');
          return updatedAt;
        }
      ],
      dependencies: ['cart_id']
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
    // The packing proposal: items → parcels, persisted as JSONB. Default
    // strategy = ONE parcel sized by the largest item-package by volume
    // (buildDefaultParcels); extensions override the whole strategy via
    // addProcessor('cartPackages', ...). Empty array when no item carries
    // package dims (legacy products) — tare then contributes nothing.
    {
      key: 'packages',
      resolvers: [
        async function resolver() {
          const items = this.getItems();
          const candidates = [];
          let goodsWeight = 0;
          for (const item of items) {
            if (item.getData('no_shipping_required')) {
              continue;
            }
            goodsWeight +=
              (item.getData('product_weight') || 0) * item.getData('qty');
            // The cart-item product loader merges package_* onto the row.
            const product = await item.getProduct();
            const length = parseFloat(product?.package_length);
            if (Number.isFinite(length)) {
              candidates.push({
                packageUuid: product.package_uuid ?? null,
                name: product.package_name ?? null,
                length,
                width: parseFloat(product.package_width),
                height: parseFloat(product.package_height),
                tareWeight: parseFloat(product.package_weight) || 0
              });
            }
          }
          const parcels = buildDefaultParcels(candidates, goodsWeight);
          return getValueSync('cartPackages', parcels, { items });
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
          // SHIPPING weight = goods + packaging. Parcel tare comes from the
          // packing proposal — the ONLY place tare enters the quote-side
          // weight (per-item weights stay goods-only; no double counting).
          // buildShippingContext and order.total_weight inherit this value.
          const parcels = this.getData('packages') ?? [];
          parcels.forEach((p) => {
            const tare = Number(p?.tareWeight);
            if (Number.isFinite(tare)) {
              weight += tare;
            }
          });
          return parseFloat(weight.toFixed(4));
        }
      ],
      dependencies: ['items', 'packages']
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
      key: 'no_shipping_required',
      resolvers: [
        async function resolver() {
          const total = 0;
          const items = this.getItems();
          return items.every((i) => i.getData('no_shipping_required') === true);
        }
      ],
      dependencies: ['items']
    },
    {
      key: 'shipping_address_id',
      resolvers: [
        async function resolver(shippingAddressId) {
          if (this.getData('no_shipping_required')) {
            return null;
          }
          return shippingAddressId;
        }
      ],
      dependencies: ['cart_id', 'no_shipping_required']
    },
    {
      key: 'shipping_address',
      resolvers: [
        async function resolver(address) {
          if (this.getData('no_shipping_required')) {
            return null;
          }
          if (!this.getData('shipping_address_id')) {
            if (validateAddress(address)) {
              return address;
            }
            return undefined;
          } else {
            const shippingAddress = await select()
              .from('cart_address')
              .where(
                'cart_address_id',
                '=',
                this.getData('shipping_address_id')
              )
              .load(pool);
            return shippingAddress;
          }
        }
      ],
      dependencies: ['shipping_address_id', 'no_shipping_required']
    },
    {
      // The cart's shipping selection. Compound JSONB value:
      //   { provider_code, method_code, snapshot, fingerprint, quotedAt }
      //
      // ⚠️ Always set via `setShippingMethod(cart, intent)` from
      //    services/setShippingMethod.ts — NEVER call
      //    `cart.setData('shipping_method_data', ...)` with a bare intent.
      //    The service pre-resolves the quote so the value handed to setData
      //    is already fully enriched. The resolver below relies on that
      //    invariant in its Case 1 branch.
      //
      // The resolver runs in two situations:
      //
      //   Case 1 — this field is the setData trigger (#triggeredField equals
      //     'shipping_method_data'). The caller went through setShippingMethod
      //     and passed an enriched value; resolver returns input unchanged so
      //     DataObject's "resolver returns what was set" contract holds.
      //
      //   Case 2 — another field's setData triggered a rebuild, or the cart
      //     is being built for the first time (#triggeredField is undefined).
      //     `input` is the previously stored snapshot, possibly stale relative
      //     to the new cart state. The resolver checks the fingerprint cache
      //     and re-quotes through `resolveShippingQuote` if stale.
      //
      // Option D — fingerprint-cached validation:
      //   In Case 2, when the cart's current fingerprint equals the cached
      //   snapshot's fingerprint AND the cache is within the provider's
      //   quoteTtlSeconds, return the cached value unchanged (no provider
      //   call). Otherwise re-quote.
      //
      // Origin is intentionally not in the fingerprint — admin-config-time
      // changes only.
      //
      // See wiki/shipping-provider-design.md → "Recompute on cart change".
      key: 'shipping_method_data',
      resolvers: [
        async function resolver(input) {
          if (this.getData('no_shipping_required')) {
            return null;
          }
          if (!input?.provider_code || !input?.method_code) {
            return null;
          }

          // Case 1 — setShippingMethod pre-resolved and called setData with
          // the enriched value. Trust it; the contract requires we return
          // input unchanged.
          if (this.getTriggeredField() === 'shipping_method_data') {
            this.setError('shipping_method_data', undefined);
            return input;
          }

          // Case 2 — rebuild on dependency change or initial build. Maybe use
          // the cache, otherwise re-quote.
          const provider = await getShippingProvider(input.provider_code);
          if (!provider) {
            this.setError(
              'shipping_method_data',
              `Shipping provider "${input.provider_code}" is not registered`
            );
            return null;
          }

          // Fast path: fingerprint match + TTL fresh → trust cached snapshot.
          const fp = computeFingerprintFromCart(this);
          if (input.snapshot && input.fingerprint === fp) {
            const ttl = provider.quoteTtlSeconds;
            const age = input.quotedAt
              ? Date.now() - new Date(input.quotedAt).getTime()
              : Infinity;
            if (!ttl || age <= ttl * 1000) {
              this.setError('shipping_method_data', undefined);
              return input;
            }
          }

          // Slow path: re-quote through the shared helper. Errors surface as
          // setError + null return for the user-visible reasons; unexpected
          // errors get logged and treated as "no method".
          try {
            const enriched = await resolveShippingQuote(this, {
              provider_code: input.provider_code,
              method_code: input.method_code
            });
            this.setError('shipping_method_data', undefined);
            return enriched;
          } catch (e) {
            this.setError(
              'shipping_method_data',
              e instanceof Error ? e.message : String(e)
            );
            error(e);
            return null;
          }
        }
      ],
      dependencies: [
        'shipping_address',
        'sub_total',
        'total_weight',
        'total_qty',
        'items',
        'no_shipping_required'
      ]
    },
    {
      // Draft shipping fee — reads the cost straight from the
      // `shipping_method_data` snapshot. Provider-specific pricing (flat,
      // tiered, API-quoted) all happened inside the provider's `getMethods`,
      // and the result was captured in the snapshot. No DB joins, no
      // calculate_api HTTP call, no inline coupon check (the coupon
      // free-shipping overlay lives in the promotion module — see
      // wiki/shipping-provider-design.md → "Shipping fee resolver chain").
      key: 'shipping_fee_draft',
      resolvers: [
        async function resolver() {
          if (this.getData('no_shipping_required')) {
            return null;
          }
          const data = this.getData('shipping_method_data');
          if (!data?.snapshot) {
            return 0;
          }
          return toPrice(String(data.snapshot.cost ?? 0));
        }
      ],
      dependencies: ['shipping_method_data', 'no_shipping_required']
    },
    {
      key: 'shipping_fee_tax_percent',
      resolvers: [
        async function resolver() {
          if (this.getData('no_shipping_required')) {
            return null;
          }
          if (!this.getData('shipping_method_data')) {
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
                const shippingAddress = this.getData('shipping_address');
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
      dependencies: [
        'sub_total',
        'shipping_method_data',
        'no_shipping_required'
      ]
    },
    {
      key: 'shipping_tax_amount',
      resolvers: [
        async function resolver() {
          if (this.getData('no_shipping_required')) {
            return 0;
          }
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
      dependencies: [
        'shipping_fee_draft',
        'shipping_fee_tax_percent',
        'no_shipping_required'
      ]
    },
    {
      key: 'shipping_fee_excl_tax',
      resolvers: [
        async function resolver() {
          if (this.getData('no_shipping_required')) {
            return 0;
          }
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
      dependencies: [
        'shipping_fee_tax_percent',
        'shipping_fee_draft',
        'no_shipping_required'
      ]
    },
    {
      key: 'shipping_fee_incl_tax',
      resolvers: [
        async function resolver() {
          if (this.getData('no_shipping_required')) {
            return 0;
          }
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
        'shipping_fee_draft',
        'no_shipping_required'
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
      key: 'billing_address',
      resolvers: [
        async function resolver(address) {
          if (!this.getData('billing_address_id')) {
            if (validateAddress(address)) {
              return address;
            }
            return undefined;
          } else {
            const billingAddress = await select()
              .from('cart_address')
              .where('cart_address_id', '=', this.getData('billing_address_id'))
              .load(pool);
            return billingAddress;
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
            methods.map((m) => m.code).includes(paymentMethod)
          ) {
            this.setError('payment_method', undefined);
            return paymentMethod;
          } else if (
            paymentMethod &&
            !methods.map((m) => m.code).includes(paymentMethod)
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
        async function resolver() {
          const methods = await getAvailablePaymentMethods();
          const method = methods.find(
            (m) => m.code === this.getData('payment_method')
          );
          return method ? method.name : this.getData('payment_method');
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
