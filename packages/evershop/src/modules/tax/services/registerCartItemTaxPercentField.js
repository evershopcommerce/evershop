const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getSetting } = require('../../setting/services/setting');
const { getTaxPercent } = require('./getTaxPercent');
const { getTaxRates } = require('./getTaxRates');

module.exports = exports = {};

exports.registerCartItemTaxPercentField = (fields) => {
  const newFields = fields.concat([
    {
      key: 'tax_percent',
      resolvers: [
        async function resolver() {
          if (!this.getData('tax_class_id')) {
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
                const cart = this.getCart();
                const addressId =
                  baseCalculationAddress === 'billingAddress'
                    ? cart.getData('billing_address_id')
                    : cart.getData('shipping_address_id');

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
    }
  ]);
  return newFields;
};
