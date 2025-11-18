import { EventDataRegistry, EventName } from '../../types/event.js';

/**
 * Type-safe event subscriber function.
 * Use this type to ensure your subscriber receives the correct event data type.
 *
 * @example
 * ```typescript
 * import { EventSubscriber } from '@evershop/evershop/lib/event/subscriber';
 *
 * const handler: EventSubscriber<'order.placed'> = async (data) => {
 *   // data is typed as EventDataRegistry['order.placed']
 *   console.log(data.orderId); // TypeScript knows this exists
 * };
 *
 * export default handler;
 * ```
 */
export type EventSubscriber<T extends EventName> = (
  data: EventDataRegistry[T]
) => Promise<void> | void;

/**
 * Helper function to create a type-safe event subscriber.
 * Provides better IDE autocomplete and type checking.
 *
 * @example
 * ```typescript
 * import { createSubscriber } from '@evershop/evershop/lib/event/subscriber';
 *
 * export default createSubscriber('order.placed', async (data) => {
 *   // data is automatically typed
 *   await sendEmail(data.orderId);
 * });
 * ```
 */
export function createSubscriber<T extends EventName>(
  eventName: T,
  handler: EventSubscriber<T>
): (data: EventDataRegistry[T]) => Promise<void> {
  return async (data: EventDataRegistry[T]) => {
    await handler(data);
  };
}
