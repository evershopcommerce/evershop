import { addProcessor, getValue } from '../../../lib/util/registry.js';
import type {
  OrderRow,
  PaymentTransactionRow
} from '../../../types/db/index.js';

/**
 * The reserved code of the built-in zero-checkout payment method. A cart
 * whose grand total is 0 accepts this method and nothing else.
 */
export const ZERO_CHECKOUT_CODE = 'zero_checkout';

export type PaymentMethodInfo = {
  code: string;
  name: string;
};

export interface PaymentMethodValidationContext {
  /**
   * The cart's `grand_total` in major currency units (already rounded by
   * `toPrice` when the cart computed it). Omit when no cart is in scope —
   * context-less callers keep the legacy behavior: zero-total-only methods
   * (`zero_checkout`) are hidden and every other method is unaffected.
   */
  cartTotal?: number;
}

/**
 * What core hands a money operation. `order` is the full order row; `transaction`
 * is the `payment_transaction` the operation acts on — the authorization for
 * `capture`/`void`, the capture for `refund`.
 */
export interface PaymentOperationContext {
  order: OrderRow;
  transaction: PaymentTransactionRow;
}

/**
 * A `refund` also receives how much to refund. The handler returns the amount the
 * gateway ACTUALLY moved (its truth, not this request) — core decides full vs
 * partial from the cumulative confirmed total.
 */
export interface PaymentRefundContext extends PaymentOperationContext {
  /** Requested refund amount, in major currency units. */
  amount: number;
  /** The order's currency (ISO code). */
  currency: string;
}

/**
 * What a money-moving operation (`capture` / `refund`) reports back so core can
 * record the ledger entry, dedupe, and emit the lifecycle event. `void` returns
 * nothing — it moves no money and records no transaction.
 */
export interface PaymentOperationResult {
  /** The gateway's transaction id — recording key, idempotency, and event payload. */
  transactionId: string;
  /** The amount actually moved, in major units (the gateway's confirmed figure). */
  amount: number;
  /** Defaults to the order's currency. */
  currency?: string;
  /**
   * Offline methods (COD, bank transfer): no gateway, nothing to reconcile. Core
   * records the transaction as offline and `transactionId` is a synthetic
   * reference.
   */
  offline?: boolean;
  /** Raw gateway response, stored on the transaction's `additional_information`. */
  raw?: unknown;
}

export type PaymentCaptureHandler = (
  context: PaymentOperationContext
) => Promise<PaymentOperationResult>;

export type PaymentVoidHandler = (
  context: PaymentOperationContext
) => Promise<void>;

export type PaymentRefundHandler = (
  context: PaymentRefundContext
) => Promise<PaymentOperationResult>;

/**
 * The payment method registration contract.
 *
 * `init` + `validator` drive checkout availability (unchanged). The optional
 * operation handlers declare — by their **presence** — which post-order money
 * operations the method supports. Core owns the orchestration (admin action,
 * transaction recording, status transition, idempotency, and lifecycle event
 * emission) and calls a handler only for the gateway step; a handler that
 * returns `PaymentOperationResult` reports what the gateway did.
 *
 * A method omits any operation it doesn't support: an offline method (COD)
 * supplies trivial handlers that return `{ offline: true }`; a method with no
 * refund support omits `refund` and gets no refund action, by construction.
 */
export type PaymentMethodFactory = {
  /** Resolves the method's `{ code, name }`. */
  init: () => PaymentMethodInfo | Promise<PaymentMethodInfo>;
  /** Checkout availability. Effectively required — see the registry validation below. */
  validator?: (
    context?: PaymentMethodValidationContext
  ) => boolean | Promise<boolean>;

  /** Settle an authorized payment. Presence ⇒ the method supports capture. */
  capture?: PaymentCaptureHandler;
  /** Release an uncaptured authorization. Presence ⇒ the method supports void. */
  void?: PaymentVoidHandler;
  /** Return captured money, in full or part. Presence ⇒ the method supports refunds. */
  refund?: PaymentRefundHandler;
  /**
   * Whether `refund` can return less than the full captured amount. Presence
   * can't express a boolean-of-a-capability, so this is an explicit flag;
   * defaults to `false`.
   */
  supportsPartialRefund?: boolean;
};

/**
 * This function retrieves the available payment methods from the registry.
 * @param context - Cart context forwarded to each factory's `validator`.
 * When `cartTotal` is 0 the list collapses to the zero-checkout method only.
 * @returns A promise that resolves to an array of payment methods.
 */
export async function getAvailablePaymentMethods(
  context: PaymentMethodValidationContext = {}
): Promise<PaymentMethodInfo[]> {
  const methods = await getValue(
    'checkoutPaymentMethods',
    [] as PaymentMethodFactory[],
    {},
    (methods: PaymentMethodFactory[]) => {
      return (
        Array.isArray(methods) &&
        methods.every(
          (method) =>
            typeof method.init === 'function' &&
            typeof method.validator === 'function'
        )
      );
    }
  );

  const applicableMethods: PaymentMethodInfo[] = [];
  for (const method of methods) {
    const methodInfo = await method.init();
    if (applicableMethods.some((m) => m.code === methodInfo.code)) {
      throw new Error(`Duplicate payment method code: ${methodInfo.code}`);
    }
    if (!method.validator || (await method.validator(context))) {
      applicableMethods.push(methodInfo);
    }
  }
  // A zero-total order accepts only the zero-checkout method. Regular
  // gateway validators cannot know about zero totals, so the exclusion is
  // enforced centrally. The reverse direction (hiding zero_checkout when the
  // total is above 0 or unknown) is the method's own validator.
  if (typeof context.cartTotal === 'number' && context.cartTotal <= 0) {
    return applicableMethods.filter((m) => m.code === ZERO_CHECKOUT_CODE);
  }
  return applicableMethods;
}

/**
 * Registers a new payment method.
 * @param factory - The factory object that contains the init and optional validator methods.
 * @throws Will throw an error if the factory does not have an init method.
 */
export function registerPaymentMethod(factory: PaymentMethodFactory): void {
  addProcessor('checkoutPaymentMethods', (methods: PaymentMethodFactory[]) => {
    return [...methods, factory];
  });
}

/**
 * Resolve the registered factory for a payment method code — with its operation
 * handlers (`capture` / `void` / `refund`) — or `undefined` when none is
 * registered. Core operation services (`refundOrder`, and later capture/void)
 * use this to reach a method's gateway handlers; it matches by calling each
 * factory's `init()`.
 */
export async function getPaymentMethodFactory(
  code: string
): Promise<PaymentMethodFactory | undefined> {
  const methods = await getValue(
    'checkoutPaymentMethods',
    [] as PaymentMethodFactory[],
    {}
  );
  for (const method of methods) {
    const info = await method.init();
    if (info.code === code) {
      return method;
    }
  }
  return undefined;
}
