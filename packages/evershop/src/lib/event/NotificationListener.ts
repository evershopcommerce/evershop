import type { Client } from 'pg';

/** The part of a pg `Client` the listener uses (a fake in the tests). */
export type ListenClient = Pick<
  Client,
  'connect' | 'query' | 'end' | 'on' | 'removeAllListeners'
>;

export interface NotificationListenerDeps {
  /** A new, unconnected client; called once for each attempt. */
  createClient: () => ListenClient;
  /** The channel of `LISTEN <channel>`: a fixed identifier, never input. */
  channel: string;
  /** Called for every notification on the channel. Must not throw. */
  onNotification: () => void;
  /**
   * Called when a lost connection listens again (not after the first one), so
   * that the caller picks up what was written while nobody listened. Must not
   * throw.
   */
  onReconnect: () => void;
  log: {
    warning: (message: string) => void;
    debug: (message: string) => void;
  };
  /** The wait before each new attempt, in ms; the last one repeats. */
  retryDelaysMs?: readonly number[];
  /** For a test. */
  setTimer?: (callback: () => void, ms: number) => unknown;
  /** For a test. */
  clearTimer?: (timer: unknown) => void;
}

export interface NotificationListener {
  /** Connects and listens. Resolves after the first attempt, failed or not. */
  start(): Promise<void>;
  /** Stops listening and stops trying. */
  stop(): void;
}

export const RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 5000, 10000];

/**
 * Keeps one connection that LISTENs on a channel, and opens a new one when it
 * breaks. A LISTEN needs a session that stays open, so it cannot use the pool.
 *
 * When the database restarts, the server ends the session: the client emits
 * an 'error' (57P01, "terminating connection due to administrator command"),
 * then an 'end'. The listener drops that client and tries a new one after 1,
 * 2, 5, then every 10 seconds, until one listens again. A dropped client keeps
 * a listener that ignores its later errors: an 'error' event with no listener
 * is thrown, and the logger's exception handler then ends the process.
 */
export function createNotificationListener(
  deps: NotificationListenerDeps
): NotificationListener {
  const { channel, log } = deps;
  const delays = deps.retryDelaysMs ?? RETRY_DELAYS_MS;
  const setTimer =
    deps.setTimer ??
    ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer =
    deps.clearTimer ??
    ((timer: unknown) => clearTimeout(timer as NodeJS.Timeout));

  let current: ListenClient | null = null;
  let timer: unknown = null;
  let failures = 0;
  let listenedBefore = false;
  let stopped = false;

  function drop(client: ListenClient): void {
    client.removeAllListeners('notification');
    client.removeAllListeners('error');
    client.removeAllListeners('end');
    client.on('error', () => undefined);
    client.end().catch(() => undefined);
  }

  /** Schedules the next attempt: its wait in ms, or null when none is. */
  function retryLater(): number | null {
    if (stopped || timer !== null) {
      return null;
    }
    const delay = delays[Math.min(failures, delays.length - 1)];
    failures += 1;
    timer = setTimer(() => {
      timer = null;
      attempt().catch(() => undefined);
    }, delay);
    return delay;
  }

  async function attempt(): Promise<void> {
    if (stopped) {
      return;
    }
    const client = deps.createClient();
    let listening = false;
    let gaveUp = false;
    const giveUp = (reason: string): void => {
      if (gaveUp) {
        return;
      }
      gaveUp = true;
      if (current === client) {
        current = null;
      }
      drop(client);
      const delay = retryLater();
      if (delay === null) {
        return;
      }
      if (listening) {
        log.warning(
          `Lost the connection that listens for "${channel}" (${reason}). Listening again in ${delay / 1000} s.`
        );
      } else {
        log.debug(
          `Could not listen for "${channel}" (${reason}). Trying again in ${delay / 1000} s.`
        );
      }
    };
    client.on('error', (e: Error) => giveUp(e.message));
    client.on('end', () => giveUp('the connection ended'));
    try {
      await client.connect();
      await client.query(`LISTEN ${channel}`);
    } catch (e) {
      giveUp((e as Error).message);
      return;
    }
    if (gaveUp) {
      return;
    }
    if (stopped) {
      gaveUp = true;
      drop(client);
      return;
    }
    listening = true;
    current = client;
    failures = 0;
    client.on('notification', () => deps.onNotification());
    if (listenedBefore) {
      log.warning(`Listening for "${channel}" again.`);
      deps.onReconnect();
    }
    listenedBefore = true;
  }

  return {
    start: attempt,
    stop() {
      stopped = true;
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      if (current) {
        const client = current;
        current = null;
        drop(client);
      }
    }
  };
}
