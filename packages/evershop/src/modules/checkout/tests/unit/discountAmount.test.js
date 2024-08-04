/* eslint-disable no-undef, global-require */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';
const config = require('config');
require('../basicSetup');
const { Cart } = require('../../services/cart/Cart');
// Default tax configuration
config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

describe('Test discount amount calculation', () => {
  it('Percentage discount to entire order', async () => {
    const cart = new Cart({
      status: 1
    });
    const pricingConfig = config.get('pricing');
    pricingConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('discount_amount')).toEqual(0);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('discount_amount')).toEqual(10);
    pricingConfig.tax.price_including_tax = true;
    await item.build();
    await cart.build();
    expect(cart.getData('discount_amount')).toEqual(10);
    pricingConfig.tax.price_including_tax = false;
    await item.build();
    const item2 = await cart.addItem(2, 2);
    expect(cart.getData('discount_amount')).toEqual(50);
    await cart.setData('coupon', '100_fixed_discount_to_entire_order');
    expect(cart.getData('discount_amount')).toEqual(100);
    pricingConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('discount_amount')).toEqual(50);
    await cart.setData('coupon', '100_fixed_discount_to_entire_order');
    expect(cart.getData('discount_amount')).toEqual(100);
  });

  it('It should apply maximum discount amount when discount amount is greater than the total price', async () => {
    const cart = new Cart({
      status: 1
    });
    const pricingConfig = config.get('pricing');
    pricingConfig.tax.price_including_tax = false;
    await cart.setData('coupon', '500_fixed_discount_to_entire_order');
    const item = await cart.addItem(1, 1);
    expect(cart.getData('discount_amount')).toEqual(100);
    const item2 = await cart.addItem(2, 1);
    expect(cart.getData('discount_amount')).toEqual(300);
    pricingConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('discount_amount')).toEqual(300);
  });
});
