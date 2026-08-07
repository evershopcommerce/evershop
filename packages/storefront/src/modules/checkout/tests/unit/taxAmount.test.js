process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import '../basicSetup.js';
import { Cart } from '../../services/cart/Cart.js';
// Default tax configuration
config.util.setModuleDefaults('pricing', {
  tax: {
    price_including_tax: false
  }
});

describe('Test tax amount calculation', () => {
  it('Tax amount should be calculated correctly when tax is not included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(item.getData('tax_amount')).toEqual(10);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('tax_amount')).toEqual(40);
    const noTaxItem = await cart.addItem(4, 1);
    expect(noTaxItem.getData('tax_amount')).toEqual(0);
    expect(cart.getData('tax_amount')).toEqual(50);
  });

  it('Tax amount should be calculated correctly when tax is included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = true;
    const item = await cart.addItem(1, 1);
    expect(item.getData('tax_amount')).toEqual(9.09);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('tax_amount')).toEqual(36.36);
    const noTaxItem = await cart.addItem(4, 1);
    expect(noTaxItem.getData('tax_amount')).toEqual(0);
    expect(cart.getData('tax_amount')).toEqual(45.45);
  });

  it('Tax amount should be calculated correctly when tax is included and discount is applied', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    priceConfig.tax.rounding = 'round';
    priceConfig.tax.round_level = 'unit';
    priceConfig.tax.precision = 2;
    const item = await cart.addItem(1, 1);
    expect(item.getData('tax_amount')).toEqual(10);
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    expect(cart.getData('tax_amount')).toEqual(9);
    const item2 = await cart.addItem(2, 2);
    expect(item2.getData('tax_amount')).toEqual(36);
    await cart.build();
    expect(cart.getData('tax_amount')).toEqual(45);
    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(item.getData('tax_amount')).toEqual(8.18);
    expect(item2.getData('tax_amount')).toEqual(32.72);
  });
});
