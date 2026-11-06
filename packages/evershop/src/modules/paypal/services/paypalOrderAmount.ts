import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { getPriceIncludingTax } from '../../tax/services/taxSettings.js';
import { buildPaypalAmount, PaypalAmountResult } from './paypalPayload.js';

export interface OrderPaypalAmount {
  built: PaypalAmountResult;
  /** The amount the store asks PayPal for, after the `paypalFinalAmount` seam */
  amount: PaypalAmountResult['amount'];
  items: any[];
}

/**
 * The amount the store asks PayPal for an order. The create-order call and
 * the payment checks both use it, so a `paypalFinalAmount` processor that
 * changes the amount is honoured on both sides.
 */
export async function buildOrderPaypalAmount(
  order: any
): Promise<OrderPaypalAmount> {
  const items = await select()
    .from('order_item')
    .where('order_item_order_id', '=', order.order_id)
    .execute(pool);
  // All values ride through one builder that guarantees the breakdown sums
  // exactly to the grand total (or drops the breakdown when per-unit rounding
  // makes that impossible — a mismatched breakdown is a 422).
  const built = buildPaypalAmount(order, items, getPriceIncludingTax());
  const amount = getValueSync('paypalFinalAmount', built.amount, {
    order,
    items
  });
  return { built, amount, items };
}
