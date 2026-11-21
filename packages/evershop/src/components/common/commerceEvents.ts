import type {
  AnyCommerceEvent,
  CommerceEvent,
  CommerceEventDataRegistry,
  CommerceEventListenerOptions,
  CommerceEventName,
  ConsentCategory
} from '@evershop/evershop/types/commerceEvents';

/**
 * The storefront's commerce event bus: the cart, checkout and product pages
 * publish shopping events here, and analytics or pixel code listens.
 *
 * ```ts
 * import { onCommerceEvent } from '@evershop/evershop/components/common/commerceEvents';
 * const stop = onCommerceEvent('product_added_to_cart', (event) => {
 *   fbq('track', 'AddToCart', { ... }, { eventID: event.id });
 * });
 * ```
 *
 * A script outside the bundle (Google Tag Manager, for example) calls
 * `window.evershop.onCommerceEvent` instead. It exists from the top of the
 * page's head: a stub there (`COMMERCE_EVENT_STUB`) queues the calls, and the
 * bus takes them over when it loads.
 *
 * - Listeners run in background-priority tasks, one each, each in try/catch:
 *   after React's pending work and the paint of the change being reported.
 *   A slow pixel then does not hold up the page's update or the shopper's
 *   next tap (Interaction to Next Paint), and a failing one does not stop the
 *   others. Deliveries still pending when the page is hidden or left
 *   (`visibilitychange`, `pagehide`) run at once, so an event published just
 *   before a navigation is not lost.
 * - The page's events are kept (the last 50) and replayed to a listener that
 *   subscribes later, such as a pixel that loads after the page: its copies
 *   have `replayed: true`.
 * - Events are frozen: a listener cannot change what the next one gets.
 * - On the server every function does nothing.
 *
 * The state lives on `window`, so two copies of this module in one page
 * share it. A copy that finds the state of another version forwards its
 * calls to that version's bus (`BusState.api`): whichever copy loads first
 * runs the bus, and every event still reaches every listener.
 * Core imports the bus by its package path, which a theme or an extension
 * cannot replace.
 */

type Handler = (event: AnyCommerceEvent) => void;

interface Listener {
  name: CommerceEventName | '*';
  handler: Handler;
  /** Recorded for cookie consent (C4); no effect yet */
  consent: ConsentCategory[];
}

interface Delivery {
  event: AnyCommerceEvent;
  listener: Listener;
}

/**
 * The bus's public functions, kept on its state. Their signatures stay the
 * same across versions, so a copy of another version can call them.
 */
interface BusApi {
  dispatch: typeof dispatchCommerceEvent;
  on: (
    name: CommerceEventName | '*',
    handler: Handler,
    options?: CommerceEventListenerOptions
  ) => () => void;
  flush: () => void;
}

interface BusState {
  version: number;
  api: BusApi;
  seq: number;
  buffer: AnyCommerceEvent[];
  listeners: Set<Listener>;
  queue: Delivery[];
  draining: boolean;
}

/** A call the head stub queued: its arguments, and how to stop it */
interface QueuedCall {
  args: [CommerceEventName | '*', Handler, CommerceEventListenerOptions?];
  stopped?: boolean;
  stop?: () => void;
}

const STATE_KEY = '__evershopCommerceEvents';
/** Change it when `BusState` changes shape */
const STATE_VERSION = 1;
const MAX_BUFFERED = 50;

type BusWindow = Window & {
  [STATE_KEY]?: BusState;
  evershop?: { commerceEventQueue?: QueuedCall[] };
};

let versionWarned = false;

/**
 * The bus of another version that already runs on this page, if any. This
 * copy then forwards its calls to it, so that every event reaches every
 * listener whichever copy loaded first.
 */
function otherBus(): BusApi | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const existing = (window as BusWindow)[STATE_KEY];
  if (!existing || existing.version === STATE_VERSION) {
    return null;
  }
  if (!versionWarned) {
    versionWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      `Two versions of the commerce event bus are on this page (${String(
        existing.version
      )} and ${STATE_VERSION}); version ${STATE_VERSION} uses version ${String(
        existing.version
      )}'s bus`
    );
  }
  return existing.api ?? null;
}

/** Subscribe the listeners the head stub queued before the bus loaded */
function takeOverStub(w: BusWindow): void {
  const evershop = w.evershop ?? {};
  w.evershop = evershop;
  const queued = evershop.commerceEventQueue ?? [];
  delete evershop.commerceEventQueue;
  evershop.onCommerceEvent = onCommerceEvent;
  queued.forEach((call) => {
    if (!call.stopped) {
      // The stub returned a function that calls `stop`
      call.stop = (onCommerceEvent as (...args: QueuedCall['args']) => () => void)(
        ...call.args
      );
    }
  });
}

function getState(): BusState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const w = window as BusWindow;
  const existing = w[STATE_KEY];
  if (existing) {
    // Another version's bus: the public functions forward to it (otherBus)
    return existing.version === STATE_VERSION ? existing : null;
  }
  const state: BusState = {
    version: STATE_VERSION,
    api: {
      dispatch: dispatchCommerceEvent,
      on: onCommerceEvent as BusApi['on'],
      flush: flushCommerceEvents
    },
    seq: 0,
    buffer: [],
    listeners: new Set(),
    queue: [],
    draining: false
  };
  w[STATE_KEY] = state;
  window.addEventListener('pagehide', flushCommerceEvents);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushCommerceEvents();
    }
  });
  takeOverStub(w);
  return state;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** A version 4 uuid, also where `crypto.randomUUID` is missing (plain http) */
function newId(): string {
  const { crypto } = globalThis;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (crypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, i) => {
      bytes[i] = Math.floor(Math.random() * 256);
    });
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    ''
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type PostTask = (
  task: () => void,
  options: { priority: 'background' }
) => Promise<unknown>;

/**
 * Run `task` when the page has nothing more urgent to do. With the
 * Prioritized Task Scheduling API, a background-priority task runs after
 * React's queued work (a drawer opening) and the paint it leads to.
 * Elsewhere: the first task after the next frame, then a plain task.
 */
function runInBackground(task: () => void, first: boolean): void {
  const { scheduler } = globalThis as unknown as {
    scheduler?: { postTask?: PostTask };
  };
  if (scheduler && typeof scheduler.postTask === 'function') {
    scheduler.postTask(task, { priority: 'background' });
    return;
  }
  // No frames in a hidden tab
  if (
    first &&
    typeof requestAnimationFrame === 'function' &&
    document.visibilityState !== 'hidden'
  ) {
    requestAnimationFrame(() => setTimeout(task, 0));
    return;
  }
  setTimeout(task, 0);
}

function deliver({ event, listener }: Delivery): void {
  // Unsubscribed after the event was queued
  if (!getState()?.listeners.has(listener)) {
    return;
  }
  try {
    listener.handler(event);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`A "${event.name}" commerce event listener failed`, e);
  }
}

/** One delivery per task, so the browser can handle input in between */
function drainNext(state: BusState): void {
  const delivery = state.queue.shift();
  if (delivery) {
    deliver(delivery);
  }
  if (state.queue.length > 0) {
    runInBackground(() => drainNext(state), false);
  } else {
    state.draining = false;
  }
}

function scheduleDrain(state: BusState): void {
  if (state.draining || state.queue.length === 0) {
    return;
  }
  state.draining = true;
  runInBackground(() => drainNext(state), true);
}

const matches = (listener: Listener, name: string) =>
  listener.name === '*' || listener.name === name;

/**
 * Publish an event. Returns it, or undefined on the server.
 *
 * `options.id` sets the event id; use an id the server can compute too
 * (`checkout_completed` uses the order uuid) when a server-side copy of the
 * event may be sent.
 */
export function dispatchCommerceEvent<N extends CommerceEventName>(
  name: N,
  data: CommerceEventDataRegistry[N],
  options: { id?: string } = {}
): CommerceEvent<N> | undefined {
  const state = getState();
  if (!state) {
    return otherBus()?.dispatch(name, data, options);
  }
  state.seq += 1;
  const event = deepFreeze({
    id: options.id ?? newId(),
    name,
    version: 1 as const,
    timestamp: new Date().toISOString(),
    seq: state.seq,
    replayed: false,
    context: {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
      language: document.documentElement.lang || navigator.language || ''
    },
    data
  }) as CommerceEvent<N>;
  state.buffer.push(event as unknown as AnyCommerceEvent);
  if (state.buffer.length > MAX_BUFFERED) {
    state.buffer.shift();
  }
  state.listeners.forEach((listener) => {
    if (matches(listener, name)) {
      state.queue.push({ event: event as unknown as AnyCommerceEvent, listener });
    }
  });
  scheduleDrain(state);
  return event;
}

/**
 * Listen to one event, or to all of them with `'*'`. Returns a function that
 * stops listening.
 */
export function onCommerceEvent<N extends CommerceEventName>(
  name: N,
  handler: (event: CommerceEvent<N>) => void,
  options?: CommerceEventListenerOptions
): () => void;
export function onCommerceEvent(
  name: '*',
  handler: (event: AnyCommerceEvent) => void,
  options?: CommerceEventListenerOptions
): () => void;
export function onCommerceEvent(
  name: CommerceEventName | '*',
  handler: Handler,
  options: CommerceEventListenerOptions = {}
): () => void {
  const state = getState();
  if (!state) {
    return otherBus()?.on(name, handler, options) ?? (() => undefined);
  }
  const listener: Listener = {
    name,
    handler,
    consent: options.consent ?? []
  };
  state.listeners.add(listener);
  if (options.replay !== false) {
    state.buffer.forEach((event) => {
      if (matches(listener, event.name)) {
        state.queue.push({
          event: Object.freeze({ ...event, replayed: true }),
          listener
        });
      }
    });
    scheduleDrain(state);
  }
  return () => {
    state.listeners.delete(listener);
  };
}

/**
 * Deliver the pending events now. The bus does it by itself when the page
 * is hidden or left; call it before a navigation the bus cannot see.
 */
export function flushCommerceEvents(): void {
  const state = getState();
  if (!state) {
    otherBus()?.flush();
    return;
  }
  while (state.queue.length > 0) {
    deliver(state.queue.shift() as Delivery);
  }
}

// Create the bus with the bundle, not with the page's first event: scripts
// outside the bundle find `window.evershop.onCommerceEvent` on every
// storefront page, also one that publishes nothing
getState();
