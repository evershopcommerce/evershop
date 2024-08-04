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

describe('Test line total with discount calculation', () => {
  it('Line total with discount should equal to the product price multiplied by quantity when tax is not included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('line_total_with_discount')).toEqual(100);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('line_total_with_discount')).toEqual(400);
  });

  it('Line total with discount including tax should be calculated with tax amount added', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('line_total_with_discount_incl_tax')).toEqual(110);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('line_total_with_discount_incl_tax')).toEqual(440);
  });

  it('Line total with discount should be calculated with tax amount deducted when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(item.getData('line_total_with_discount')).toEqual(90.91);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('line_total_with_discount')).toEqual(363.64);
  });

  it('Line total with discount including tax should be equal to product price when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(item.getData('line_total_with_discount_incl_tax')).toEqual(100);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('line_total_with_discount_incl_tax')).toEqual(400);
  });

  it('Line total with discount should be affected by discount amount', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('line_total_with_discount')).toEqual(100);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('discount_amount')).toEqual(10);
    expect(item.getData('line_total_with_discount')).toEqual(90);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('line_total_with_discount')).toEqual(360);
    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(item.getData('line_total_with_discount')).toEqual(81.82);
    expect(item2.getData('line_total_with_discount')).toEqual(327.28);
  });

  it('Line total with discount including tax should be affected by discount amount', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('line_total_with_discount_incl_tax')).toEqual(110);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('discount_amount')).toEqual(10);
    expect(item.getData('line_total_with_discount_incl_tax')).toEqual(99);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('line_total_with_discount_incl_tax')).toEqual(396);
    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(item.getData('line_total_with_discount_incl_tax')).toEqual(90);
    expect(item2.getData('line_total_with_discount_incl_tax')).toEqual(360);
  });
});
