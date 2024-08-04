const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { toPrice } = require('../../checkout/services/toPrice');

module.exports = exports = {};
module.exports.registerCartItemPromotionFields =
  function registerCartItemPromotionFields(fields) {
    const newFields = fields.concat(
      /** Adding fields to the Cart Item object */
      [
        {
          key: 'discount_amount',
          resolvers: [
            async function resolver() {
              const requestedField = this.getTriggeredField();
              const requestedValue = this.getRequestedValue();
              if (requestedField === 'discount_amount') {
                return toPrice(requestedValue);
              } else {
                return 0;
              }
            }
          ]
        },
        {
          key: 'line_total_with_discount',
          resolvers: [
            async function resolver() {
              const priceIncludingTax = getConfig(
                'pricing.tax.price_including_tax',
                false
              );
              if (!priceIncludingTax) {
                return (
                  this.getData('line_total') - this.getData('discount_amount')
                );
              } else {
                return (
                  this.getData('line_total_incl_tax') -
                  this.getData('discount_amount') -
                  this.getData('tax_amount')
                );
              }
            }
          ],
          dependencies: ['line_total', 'line_total_incl_tax', 'tax_amount']
        },
        {
          key: 'line_total_with_discount_incl_tax',
          resolvers: [
            async function resolver() {
              const priceIncludingTax = getConfig(
                'pricing.tax.price_including_tax',
                false
              );
              if (!priceIncludingTax) {
                return toPrice(
                  this.getData('line_total') -
                    this.getData('discount_amount') +
                    this.getData('tax_amount')
                );
              } else {
                return toPrice(
                  this.getData('line_total_incl_tax') -
                    this.getData('discount_amount')
                );
              }
            }
          ],
          dependencies: [
            'line_total_incl_tax',
            'line_total',
            'qty',
            'tax_amount',
            'discount_amount'
          ]
        }
      ]
    );
    return newFields;
  };
