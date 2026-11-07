import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Query: {
    // Both set by the page's middleware (`cartRecoverConfirm/index.ts`)
    cartRecoveryStatus: (
      _: unknown,
      __: unknown,
      context: Record<string, unknown>
    ) => context.cartRecoveryStatus ?? null,
    // The CartItem shape, as `Cart.items` gives it (CartItem resolvers apply)
    cartRecoveryItems: (
      _: unknown,
      __: unknown,
      context: Record<string, unknown>
    ) =>
      ((context.cartRecoveryItems as Array<Record<string, unknown>>) ?? []).map(
        (item) => camelCase(item)
      )
  }
};
