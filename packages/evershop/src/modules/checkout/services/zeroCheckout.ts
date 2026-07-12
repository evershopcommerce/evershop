import {
  commit,
  getConnection,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../../../lib/event/emitter.js';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import type { OrderRow } from '../../../types/db/index.js';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import { updatePaymentStatus } from '../../oms/services/updatePaymentStatus.js';
import { Cart } from './cart/Cart.js';
import {
  PaymentMethodValidationContext,
  registerPaymentMethod,
  ZERO_CHECKOUT_CODE
} from './getAvailablePaymentMethods.js';
import { addOrderValidationRule } from './orderValidator.js';

function isZeroTotal(total: unknown): boolean {
  return typeof total === 'number' && !Number.isNaN(total) && total <= 0;
}

/**
 * `grand_total` is registered by the promotion module; without it the cart
 * has no such field and `getData` throws. `undefined` means "total unknowable"
 * — zero-checkout is then never applicable.
 */
function readGrandTotal(cart: Cart): number | undefined {
  try {
    return cart.getData('grand_total') as number;
  } catch (e) {
    return undefined;
  }
}

/**
 * Registers the built-in zero-checkout payment method. Always enabled — no
 * setting, no config: its validator is purely "is the cart total 0".
 * Must be called from a module bootstrap (the registry locks afterwards).
 */
export function registerZeroCheckoutPaymentMethod(): void {
  registerPaymentMethod({
    init: () => ({ code: ZERO_CHECKOUT_CODE, name: 'No payment required' }),
    validator: (context?: PaymentMethodValidationContext) =>
      isZeroTotal(context?.cartTotal)
  });
}

/**
 * Placement-boundary guards. The `payment_method` cart-field resolver already
 * rejects every explicitly selected wrong method, but a cart whose
 * `payment_method` was never set carries no field error — these rules close
 * that bypass at `validateBeforeCreateOrder`, which both order-creation
 * endpoints funnel through. Scoped to zero-total carts on purpose: placing a
 * methodless order with a total above 0 is pre-existing platform behavior
 * and stays untouched.
 */
export function registerZeroCheckoutOrderValidation(): void {
  addOrderValidationRule({
    id: 'zeroTotalRequiresZeroCheckout',
    func: (cart: Cart) => {
      const total = readGrandTotal(cart);
      if (total === undefined || !isZeroTotal(total)) {
        return true;
      }
      return cart.getData('payment_method') === ZERO_CHECKOUT_CODE;
    },
    errorMessage:
      "Zero-total orders must use the 'No payment required' payment method"
  });
  addOrderValidationRule({
    id: 'zeroCheckoutRequiresZeroTotal',
    func: (cart: Cart) => {
      if (cart.getData('payment_method') !== ZERO_CHECKOUT_CODE) {
        return true;
      }
      return isZeroTotal(readGrandTotal(cart));
    },
    errorMessage:
      "The 'No payment required' payment method cannot be used when the order total is greater than zero"
  });
}

/**
 * Flips a freshly placed zero-checkout order to `paid` (one transaction:
 * status update + activity log), then emits `order_placed` with the
 * re-loaded row so subscribers see the paid order. The `changePaymentStatus`
 * after-hook recomputes `order.status` from the PSO mapping on the same
 * connection.
 */
export async function completeZeroCheckoutOrder(orderId: number): Promise<void> {
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    await updatePaymentStatus(orderId, 'paid', connection);
    await addOrderActivityLog(
      orderId,
      'Payment completed automatically (zero-total order)',
      false,
      connection
    );
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }
  const order = await select()
    .from('order')
    .where('order_id', '=', orderId)
    .load(pool);
  await emit('order_placed', { ...order });
}

/**
 * `hookAfter('createOrderFunc')` handler. Runs after the order transaction
 * has committed: a failure here must NOT surface as a failed checkout for an
 * order that already exists, so it logs and swallows — the order then stays
 * `pending` for manual review, the same failure class as a lost gateway
 * webhook.
 */
export async function markZeroCheckoutOrderPaid(
  order:
    | (Partial<OrderRow> & Pick<OrderRow, 'order_id' | 'payment_method'>)
    | null
    | undefined,
  complete: (orderId: number) => Promise<void> = completeZeroCheckoutOrder
): Promise<void> {
  if (!order || order.payment_method !== ZERO_CHECKOUT_CODE) {
    return;
  }
  try {
    await complete(order.order_id);
  } catch (e) {
    error(e);
  }
}
