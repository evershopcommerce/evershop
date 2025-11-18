/**
 * Event registry that maps event names to their data types.
 * Extend this interface in your modules to register custom events.
 * 
 * @example
 * ```typescript
 * // In your module
 * declare module '@evershop/evershop/lib/event/types' {
 *   interface EventDataRegistry {
 *     'order.placed': {
 *       orderId: number;
 *       customerId: number;
 *       total: number;
 *       items: Array<{ productId: number; quantity: number }>;
 *     };
 *     'customer.registered': {
 *       customerId: number;
 *       email: string;
 *       name: string;
 *     };
 *   }
 * }
 * ```
 */
export interface EventDataRegistry {
  // Core events can be defined here
  // Modules can extend this interface to add their own events
}

/**
 * Extract event names from the registry
 */
export type EventName = keyof EventDataRegistry;

/**
 * Get the data type for a specific event
 */
export type EventData<T extends EventName> = EventDataRegistry[T];
