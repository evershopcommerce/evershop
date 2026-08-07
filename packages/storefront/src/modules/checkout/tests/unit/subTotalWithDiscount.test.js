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

describe('Test sub total with discount calculation', () => {
  it('Sub total with discount should equal to the sub total when discount is not applied', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total')).toEqual(100);
    expect(cart.getData('sub_total_with_discount')).toEqual(100);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total')).toEqual(223.45);
    expect(cart.getData('sub_total_with_discount')).toEqual(223.45);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('sub_total')).toEqual(206.01);
    expect(cart.getData('sub_total_with_discount')).toEqual(206.01);
  });

  it('Sub total with discount including tax should be equal to the sub total including tax when discount is not applied', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(110);
    expect(cart.getData('sub_total_with_discount_incl_tax')).toEqual(110);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(242.4);
    expect(cart.getData('sub_total_with_discount_incl_tax')).toEqual(242.4);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('sub_total_incl_tax')).toEqual(223.45);
    expect(cart.getData('sub_total_with_discount_incl_tax')).toEqual(223.45);
  });

  it('Sub total with discount should be calculated with discount amount deducted', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total')).toEqual(100);
    expect(cart.getData('sub_total_with_discount')).toEqual(90);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total')).toEqual(223.45);
    expect(cart.getData('sub_total_with_discount')).toEqual(201.1);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('sub_total')).toEqual(206.01);
    expect(cart.getData('sub_total_with_discount')).toEqual(185.41);
  });

  it('Sub total with discount including tax should be calculated with tax amount added', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    await cart.setData('coupon', 'ten_percent_discount_to_entire_order');
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(110);
    expect(cart.getData('sub_total_with_discount_incl_tax')).toEqual(99);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total_incl_tax')).toEqual(242.4);
    expect(cart.getData('sub_total_with_discount_incl_tax')).toEqual(218.15);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('sub_total_incl_tax')).toEqual(223.45);
    expect(cart.getData('sub_total_with_discount_incl_tax')).toEqual(201.1);
  });

  it('Sub total with discount should be equal to the sum of line total with discount of all items when discount is not applied', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(1, 1);
    expect(cart.getData('sub_total_with_discount')).toEqual(100);
    const item2 = await cart.addItem(5, 1);
    expect(cart.getData('sub_total_with_discount')).toEqual(223.45);

    priceConfig.tax.price_including_tax = true;
    await item.build();
    await item2.build();
    await cart.build();
    expect(cart.getData('sub_total_with_discount')).toEqual(206.01);
  });
});
