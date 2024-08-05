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

// This test assumes there is no additional fee like shipping fee, etc.
describe('Test grand total calculation', () => {
  it('Grand total should equal to the sum of line total with discount including tax of all items when discount is not applied', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1); // Tax percent 10%
    expect(cart.getData('grand_total')).toEqual(110);
    const item2 = await cart.addItem(5, 1); // Tax percent 7.25%
    expect(cart.getData('grand_total')).toEqual(242.4);
    const item3 = await cart.addItem(2, 2); // Tax percent 10%
    expect(cart.getData('grand_total')).toEqual(682.4);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await item3.build();
    await cart.build();
    expect(cart.getData('grand_total')).toEqual(623.45);
  });

  it('Grand total should alway be equal to the sub total including tax when discount is not applied', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('grand_total')).toEqual(110);
    expect(cart.getData('sub_total_incl_tax')).toEqual(110);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('grand_total')).toEqual(242.4);
    expect(cart.getData('sub_total_incl_tax')).toEqual(242.4);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('grand_total')).toEqual(223.45);
    expect(cart.getData('sub_total_incl_tax')).toEqual(223.45);
  });

  it('Grand total should be calculated with discount amount deducted', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1); // Tax percent 10%
    expect(cart.getData('grand_total')).toEqual(110);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('grand_total')).toEqual(99);
    const item2 = await cart.addItem(5, 1); // Tax percent 7.25%
    // Tax rounding unit level, round to nearest with 2 decimal places
    expect(cart.getData('grand_total')).toEqual(218.15);
    const item3 = await cart.addItem(2, 2); // Tax percent 10%
    expect(cart.getData('grand_total')).toEqual(614.15);

    await cart.setData('coupon', '100_fixed_discount_to_entire_order');
    expect(cart.getData('grand_total')).toEqual(572.94);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await item3.build();
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('grand_total')).toEqual(561.1);
  });
});
