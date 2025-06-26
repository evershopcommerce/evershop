import { addProcessor, getValue } from '../../../lib/util/registry.js';

export type PaymentMethod = {
  methodCode: string;
  methodName: string;
};

/**
 * This function retrieves the available payment methods from the registry.
 * @returns A promise that resolves to an array of payment methods.
 */
export async function getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
  // TODO: Support different payment methods per cart
  const methods = await getValue(
    'checkoutPaymentMethods',
    [] as PaymentMethod[],
    {},
    (methods: PaymentMethod[]) => {
      return (
        Array.isArray(methods) &&
        methods.every(
          (method) =>
            typeof method.methodCode === 'string' &&
            typeof method.methodName === 'string'
        )
      );
    }
  );
  return methods;
}

export function registerPaymentMethod(
  methodCode: string,
  methodName: string
): void {
  addProcessor('checkoutPaymentMethods', (methods: PaymentMethod[]) => {
    return [
      ...methods,
      {
        methodCode,
        methodName
      }
    ];
  });
}
