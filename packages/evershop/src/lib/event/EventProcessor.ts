import { debug, error } from '../log/logger.js';
import { callSubscribers } from './callSubscibers.js';
import type { EventRow, EventStorage } from './EventStorage.js';

const BATCH_SIZE = 10;

type Subscriber = {
  event: string;
  subscriber: (data: unknown) => void | Promise<void>;
};

type EventProcessorDeps = {
  storage: Pick<EventStorage, 'claimBatch' | 'markDoneAndDelete'>;
  subscribers: Subscriber[];
  /**
   * Optional hook run once per non-empty batch, before its subscribers execute. The
   * event-manager passes `refreshSetting` here so off-request emails pick up admin setting
   * changes (locale, store name, address) without a worker restart — this process holds
   * its own settings cache that only `saveSetting` (in the web process) otherwise
   * invalidates. A failure is logged and ignored (degrade to cached settings, never drop
   * events). Omitted in unit tests, so the processor stays DB-free there.
   */
  beforeBatch?: () => Promise<void>;
};

/**
 * Pure event processing logic. Accepts storage and subscribers as dependencies
 * so both can be replaced with mocks in tests — no real DB or filesystem needed.
 */
export function createEventProcessor({
  storage,
  subscribers,
  beforeBatch
}: EventProcessorDeps) {
  // Guard: prevents concurrent DB claim transactions while one is in-flight
  let isProcessing = false;

  async function executeSubscribers(event: EventRow): Promise<void> {
    try {
      const matchingSubscribers = subscribers
        .filter((s) => s.event === event.name)
        .map((s) => s.subscriber);
      await callSubscribers(matchingSubscribers, event.data);
    } catch (e) {
      error(e);
    } finally {
      try {
        await storage.markDoneAndDelete(event.uuid);
      } catch (e) {
        error(e);
      }
    }
  }

  async function loadAndProcess(): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;
    try {
      let events: EventRow[];
      try {
        events = await storage.claimBatch(BATCH_SIZE);
      } catch (e) {
        error(e);
        return;
      }

      if (events.length === 0) return;

      // Refresh per-process caches (e.g. settings) before rendering this batch, so emails
      // reflect recent admin changes. Only on non-empty batches — never on idle polls.
      if (beforeBatch) {
        try {
          await beforeBatch();
        } catch (e) {
          error(e);
        }
      }

      debug(`Processing ${events.length} event(s)`);

      // Each event runs concurrently; errors are isolated per event
      events.forEach((event) => {
        executeSubscribers(event).catch((e) => error(e));
      });

      // Full batch — more rows likely waiting, schedule next claim immediately
      if (events.length === BATCH_SIZE) {
        setImmediate(() => loadAndProcess().catch((e) => error(e)));
      }
    } finally {
      // Reset before subscribers finish so new notifications can trigger
      // a fresh claim while current subscribers are still running
      isProcessing = false;
    }
  }

  return { loadAndProcess };
}
