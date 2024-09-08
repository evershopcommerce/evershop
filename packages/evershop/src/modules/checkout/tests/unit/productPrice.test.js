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

describe('Test product price calculation', () => {
  it('Price should equal to the product price when tax is not included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('product_price')).toEqual(100);
    expect(item.getData('final_price')).toEqual(100);
    const noTax = await cart.addItem(4, 1);
    expect(noTax.getData('product_price')).toEqual(300);
    expect(noTax.getData('final_price')).toEqual(300);
  });

  it('Price including tax should be calculated with tax amount added', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('product_price_incl_tax')).toEqual(110);
    expect(item.getData('final_price_incl_tax')).toEqual(110);
    const noTax = await cart.addItem(4, 1);
    expect(noTax.getData('product_price')).toEqual(300);
    expect(noTax.getData('final_price')).toEqual(300);
  });

  it('Price should be calculated with tax amount deducted when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(item.getData('product_price')).toEqual(90.91);
    expect(item.getData('final_price')).toEqual(90.91);
    const noTax = await cart.addItem(4, 1);
    expect(noTax.getData('product_price')).toEqual(300);
    expect(noTax.getData('final_price')).toEqual(300);
  });

  it('Price including tax should be equal to product price when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(item.getData('product_price_incl_tax')).toEqual(100);
    expect(item.getData('final_price_incl_tax')).toEqual(100);
    const noTax = await cart.addItem(4, 1);
    expect(noTax.getData('product_price')).toEqual(300);
    expect(noTax.getData('final_price')).toEqual(300);
  });
});
