/**
 * How long core lets an event stay `processing` before it counts it as lost: an
 * event process that died leaves such rows, and nothing will ever answer them
 * (`EventStorage.markStuckAsFailed`). The backlog does not count them.
 */
export const EVENT_STUCK_AFTER_MS = 5 * 60_000;

/**
 * The event queue the writes of an import feed (§ 8.5). Creating a category or a
 * product writes an event, and the event process starts the handlers of all the
 * events it has claimed without waiting for them, so a burst of writes becomes
 * a burst of handlers and delays every later event, such as an order email. The
 * worker looks at the length of the queue and slows down.
 *
 * The real one is `PgEventBacklog`; the test double is `FakeEventBacklog`, with
 * a depth a test sets.
 */
export interface EventBacklog {
  /**
   * How many events are waiting for the event process: those `pending`, and
   * those `processing` for less than `EVENT_STUCK_AFTER_MS`. Events of every
   * kind count, not only the ones the import wrote.
   */
  depth(): Promise<number>;
}
