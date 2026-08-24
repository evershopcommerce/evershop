import {
  isCashbackEnabled,
  getCashbackPercentage,
  getCashbackMinOrderAmount
} from './cashbackSettings.js';

export async function calculateOrderCashback(
  orderSubtotal: number
): Promise<number> {
  const enabled = await isCashbackEnabled();
  if (!enabled) {
    return 0;
  }

  const minOrderAmount = await getCashbackMinOrderAmount();
  if (orderSubtotal < minOrderAmount) {
    return 0;
  }

  const percentage = await getCashbackPercentage();
  if (percentage <= 0) {
    return 0;
  }

  const cashback = (orderSubtotal * percentage) / 100;
  return Math.round(cashback * 100) / 100;
}
