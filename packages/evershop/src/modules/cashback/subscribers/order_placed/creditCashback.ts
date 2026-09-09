import { EventData } from '../../../../types/event.js';
import { calculateOrderCashback } from '../../services/calculateOrderCashback.js';
import {
  creditPendingCashback,
  activatePendingCashback
} from '../../services/customerBalanceService.js';
import { debug, error } from '../../../../lib/log/logger.js';

export default async function creditCashback(
  order: EventData<'order_placed'>
) {
  try {
    if (!order || !order.customer_id) {
      return;
    }

    const customerId = parseInt(String(order.customer_id), 10);
    const orderId = parseInt(String(order.order_id), 10);
    const subTotal = parseFloat(String(order.sub_total || order.grand_total || 0));

    if (!customerId || !orderId || subTotal <= 0) {
      return;
    }

    const cashbackAmount = await calculateOrderCashback(subTotal);
    if (cashbackAmount > 0) {
      await creditPendingCashback(
        customerId,
        orderId,
        cashbackAmount,
        `Cashback earned from order #${order.order_number || orderId}`
      );
      debug(`[Cashback] Credited $${cashbackAmount} pending cashback to customer #${customerId} for order #${orderId}`);

      // If order payment status is already paid or COD, activate immediately
      if (
        order.payment_status === 'paid' ||
        order.payment_method === 'cod'
      ) {
        await activatePendingCashback(customerId, orderId);
        debug(`[Cashback] Activated $${cashbackAmount} cashback for order #${orderId}`);
      }
    }
  } catch (err: any) {
    error(`[Cashback Error] Failed to process order cashback: ${err?.message || err}`);
  }
}
