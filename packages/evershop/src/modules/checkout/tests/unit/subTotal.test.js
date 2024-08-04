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

describe('Test sub total calculation', () => {
  it('Sub total should equal to the sum of line total of all items when tax is not included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total')).toEqual(100);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total')).toEqual(223.45);
  });

  it('Sub total including tax should be calculated with tax amount added', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(110);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(242.4);
  });

  it('Sub total should be calculated with tax amount deducted when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total')).toEqual(90.91);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total')).toEqual(206.01);
  });

  it('Sub total including tax should be equal to the sum of line total including tax of all items when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(100);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(223.45);
  });

  it('Sub total should not be affected by discount amount', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    await cart.addItem(1, 1);
    expect(cart.getData('sub_total')).toEqual(100);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('sub_total')).toEqual(100);
  });

  it('Sub total including tax should not be affected by discount amount', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    await cart.addItem(1, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(110);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('sub_total_incl_tax')).toEqual(110);
  });
});
