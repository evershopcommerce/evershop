import { addProcessor, getValue } from '../../../lib/util/registry.js';

export type PaymentMethodInfo = {
  methodCode: string;
  methodName: string;
  meta?: Record<string, any>;
};

export type PaymentMethodFactory = {
  init: () => PaymentMethodInfo | Promise<PaymentMethodInfo>;
  validator?: () => boolean | Promise<boolean>;
};

/**
 * This function retrieves the available payment methods from the registry.
 * @returns A promise that resolves to an array of payment methods.
 */
export async function getAvailablePaymentMethods(): Promise<
  PaymentMethodInfo[]
> {
  // TODO: Support different payment methods per cart
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
    if (applicableMethods.some((m) => m.methodCode === methodInfo.methodCode)) {
      throw new Error(
        `Duplicate payment method code: ${methodInfo.methodCode}`
      );
    }
    if (!method.validator || (await method.validator())) {
      applicableMethods.push(methodInfo);
    }
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
