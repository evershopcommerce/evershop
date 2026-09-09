import { getSetting } from '../../setting/services/setting.js';

export async function isCashbackEnabled(): Promise<boolean> {
  const enabled = await getSetting('cashback_enabled', 1);
  return parseInt(String(enabled), 10) === 1;
}

export async function getCashbackPercentage(): Promise<number> {
  const percentage = await getSetting('cashback_percentage', 5);
  return parseFloat(String(percentage)) || 0;
}

export async function getCashbackMinOrderAmount(): Promise<number> {
  const minAmount = await getSetting('cashback_min_order_amount', 0);
  return parseFloat(String(minAmount)) || 0;
}
