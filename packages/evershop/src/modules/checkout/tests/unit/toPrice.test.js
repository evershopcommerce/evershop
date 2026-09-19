process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { toPrice } from '../../services/toPrice.js';

// Default pricing configuration
config.util.setModuleDefaults('pricing', {
  rounding: 'round',
  precision: 2
});

describe('toPrice rounding modes', () => {
  it('supports `round`, `ceil` and `floor` (with `up`/`down` legacy aliases)', () => {
    const priceConfig = config.get('pricing');
    priceConfig.precision = 2;

    // `round` -> nearest
    priceConfig.rounding = 'round';
    expect(toPrice('1.234')).toEqual(1.23);
    expect(toPrice('1.236')).toEqual(1.24);

    // `ceil` -> always up; `up` is the legacy alias
    priceConfig.rounding = 'ceil';
    expect(toPrice('1.234')).toEqual(1.24);
    expect(toPrice('1.231')).toEqual(1.24);
    priceConfig.rounding = 'up';
    expect(toPrice('1.234')).toEqual(1.24);

    // `floor` -> always down; `down` is the legacy alias
    priceConfig.rounding = 'floor';
    expect(toPrice('1.236')).toEqual(1.23);
    expect(toPrice('1.239')).toEqual(1.23);
    priceConfig.rounding = 'down';
    expect(toPrice('1.236')).toEqual(1.23);
  });
});
