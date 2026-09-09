import { calculateOrderCashback } from '../../services/calculateOrderCashback.js';
import * as cashbackSettings from '../../services/cashbackSettings.js';

jest.mock('../../services/cashbackSettings.js');

describe('calculateOrderCashback unit tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns 0 if cashback program is disabled', async () => {
    jest.spyOn(cashbackSettings, 'isCashbackEnabled').mockResolvedValue(false);
    jest.spyOn(cashbackSettings, 'getCashbackPercentage').mockResolvedValue(10);
    jest.spyOn(cashbackSettings, 'getCashbackMinOrderAmount').mockResolvedValue(0);

    const result = await calculateOrderCashback(100);
    expect(result).toBe(0);
  });

  test('returns 0 if subtotal is less than min order amount threshold', async () => {
    jest.spyOn(cashbackSettings, 'isCashbackEnabled').mockResolvedValue(true);
    jest.spyOn(cashbackSettings, 'getCashbackPercentage').mockResolvedValue(5);
    jest.spyOn(cashbackSettings, 'getCashbackMinOrderAmount').mockResolvedValue(50);

    const result = await calculateOrderCashback(30);
    expect(result).toBe(0);
  });

  test('calculates correct cashback percentage when subtotal exceeds threshold', async () => {
    jest.spyOn(cashbackSettings, 'isCashbackEnabled').mockResolvedValue(true);
    jest.spyOn(cashbackSettings, 'getCashbackPercentage').mockResolvedValue(10);
    jest.spyOn(cashbackSettings, 'getCashbackMinOrderAmount').mockResolvedValue(20);

    const result = await calculateOrderCashback(150);
    expect(result).toBe(15);
  });

  test('rounds cashback amount to 2 decimal places', async () => {
    jest.spyOn(cashbackSettings, 'isCashbackEnabled').mockResolvedValue(true);
    jest.spyOn(cashbackSettings, 'getCashbackPercentage').mockResolvedValue(7.5);
    jest.spyOn(cashbackSettings, 'getCashbackMinOrderAmount').mockResolvedValue(0);

    const result = await calculateOrderCashback(33.33);
    expect(result).toBe(2.5);
  });
});
