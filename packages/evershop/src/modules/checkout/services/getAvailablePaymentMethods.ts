import { addProcessor, getValue } from '../../../lib/util/registry.js';

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

export type PaymentMethodFactory = {
  init: () => PaymentMethodInfo | Promise<PaymentMethodInfo>;
  validator?: (
    context?: PaymentMethodValidationContext
  ) => boolean | Promise<boolean>;
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
