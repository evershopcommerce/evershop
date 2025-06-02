process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import '../basicSetup.js';
import { Cart } from '../../services/cart/Cart.js';
// Default tax configuration
config.util.setModuleDefaults('pricing', {
  tax: {
    rounding: 'round',
    precision: 2,
    round_level: 'unit',
    price_including_tax: false
  }
});

describe('Test tax amount calculation rounding', () => {
  it('Tax amount should be calculated correctly when tax is not included', async () => {
    const cart = new Cart({
      status: 1
    });
    const priceConfig = config.get('pricing');
    // Round
    /// Level: unit
    priceConfig.tax.precision = 2;
    priceConfig.tax.round_level = 'unit';
    priceConfig.tax.price_including_tax = false;
    const item = await cart.addItem(5, 1);
    expect(item.getData('tax_amount')).toEqual(8.95);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.9);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.85);
    const item2 = await cart.addItem(1, 2);
    expect(item2.getData('tax_amount')).toEqual(20);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(27);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(27);

    /// Level: line
    priceConfig.tax.precision = 2;
    priceConfig.tax.round_level = 'line';
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.95);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.9);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.85);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.9);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.9);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(27);

    /// Level: total
    priceConfig.tax.round_level = 'total';
    priceConfig.tax.precision = 2;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    // Ceil
    /// Level: unit
    priceConfig.tax.rounding = 'up';
    priceConfig.tax.round_level = 'unit';
    priceConfig.tax.precision = 2;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.96);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.92);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.88);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(27);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(27);

    /// Level: line
    priceConfig.tax.precision = 2;
    priceConfig.tax.round_level = 'line';
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.96);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.91);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.86);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.9);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(18);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(27);

    /// Level: total
    priceConfig.tax.round_level = 'total';
    priceConfig.tax.precision = 2;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    // Floor
    /// Level: unit
    priceConfig.tax.rounding = 'down';
    priceConfig.tax.round_level = 'unit';
    priceConfig.tax.precision = 2;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.95);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.9);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.85);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.8);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.7);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(16);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(24);

    /// Level: line
    priceConfig.tax.precision = 2;
    priceConfig.tax.round_level = 'line';
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.95);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.9);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.85);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.9);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.9);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.8);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26);

    /// Level: total
    priceConfig.tax.round_level = 'total';
    priceConfig.tax.precision = 2;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    priceConfig.tax.precision = 1;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);

    priceConfig.tax.precision = 0;
    await item.setData('qty', 1);
    expect(item.getData('tax_amount')).toEqual(8.950125);
    await item.setData('qty', 2);
    expect(item.getData('tax_amount')).toEqual(17.90025);
    await item.setData('qty', 3);
    expect(item.getData('tax_amount')).toEqual(26.850375);
  });

  // it('Tax amount should be calculated correctly when tax is included', async () => {
  //   const cart = new Cart({
  //     status: 1
  //   });
  //   const priceConfig = config.get('pricing');
  //   priceConfig.tax.price_including_tax = true;
  //   const item = await cart.addItem(5, 1);
  //   expect(item.getData('tax_amount')).toEqual(8.35);
  //   priceConfig.tax.precision = 1;
  //   await item.build();
  //   expect(item.getData('tax_amount')).toEqual(8.3);
  // });
});
