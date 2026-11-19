import { EventEmitter } from 'events';
import { describe, it, expect } from '@jest/globals';
import {
  createNotificationListener,
  type ListenClient
} from '../../NotificationListener.js';

/**
 * The connection that LISTENs for new events, when the database ends it. A
 * fake client stands for pg's Client (it emits 'error', 'end' and
 * 'notification' as pg does) and the waits are recorded instead of run, so
 * each one is checked by its length and fired by hand.
 */
interface Plan {
  connectError?: Error;
  queryError?: Error;
}

class FakeClient extends EventEmitter {
  queries: string[] = [];

  ended = false;

  constructor(private readonly plan: Plan) {
    super();
  }

  async connect(): Promise<void> {
    if (this.plan.connectError) {
      throw this.plan.connectError;
    }
  }

  async query(sql: string): Promise<void> {
    this.queries.push(sql);
    if (this.plan.queryError) {
      throw this.plan.queryError;
    }
  }

  async end(): Promise<void> {
    this.ended = true;
  }
}

const adminShutdown = () =>
  new Error('terminating connection due to administrator command');
const refused = () => new Error('connect ECONNREFUSED 127.0.0.1:5432');
const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

function setUp(plans: Plan[] = []) {
  const clients: FakeClient[] = [];
  const timers: { callback: () => void; ms: number; cleared: boolean }[] = [];
  const logs = { warning: [] as string[], debug: [] as string[] };
  const calls = { notification: 0, reconnect: 0 };
  const listener = createNotificationListener({
    createClient: () => {
      const client = new FakeClient(plans.shift() ?? {});
      clients.push(client);
      return client as unknown as ListenClient;
    },
    channel: 'new_event',
    onNotification: () => {
      calls.notification += 1;
    },
    onReconnect: () => {
      calls.reconnect += 1;
    },
    log: {
      warning: (message) => {
        logs.warning.push(message);
      },
      debug: (message) => {
        logs.debug.push(message);
      }
    },
    setTimer: (callback, ms) => {
      const timer = { callback, ms, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      (timer as { cleared: boolean }).cleared = true;
    }
  });
  /** Runs the last wait, then lets the attempt it starts finish. */
  const fireLastTimer = async () => {
    timers[timers.length - 1].callback();
    await flush();
  };
  const waits = () => timers.map((timer) => timer.ms);
  return { listener, clients, logs, calls, timers, waits, fireLastTimer };
}

describe('the LISTEN connection of the event process', () => {
  it('listens on the channel at start and passes each notification on', async () => {
    const t = setUp();
    await t.listener.start();
    expect(t.clients).toHaveLength(1);
    expect(t.clients[0].queries).toEqual(['LISTEN new_event']);
    t.clients[0].emit('notification', { channel: 'new_event' });
    expect(t.calls.notification).toBe(1);
    expect(t.waits()).toEqual([]);
    expect(t.logs).toEqual({ warning: [], debug: [] });
  });

  it('when the database ends it: drops the client, warns once, listens on a new one after 1 s, then drains', async () => {
    const t = setUp();
    await t.listener.start();
    const [lost] = t.clients;
    lost.emit('error', adminShutdown());
    lost.emit('end');
    expect(t.waits()).toEqual([1000]);
    expect(lost.ended).toBe(true);
    expect(t.logs.warning).toEqual([
      'Lost the connection that listens for "new_event" (terminating connection due to administrator command). Listening again in 1 s.'
    ]);
    // A later error of the dropped client is ignored, not thrown.
    expect(() =>
      lost.emit('error', new Error('Connection terminated unexpectedly'))
    ).not.toThrow();

    await t.fireLastTimer();
    expect(t.clients).toHaveLength(2);
    expect(t.clients[1].queries).toEqual(['LISTEN new_event']);
    expect(t.calls.reconnect).toBe(1);
    expect(t.logs.warning[1]).toBe('Listening for "new_event" again.');

    lost.emit('notification', {});
    expect(t.calls.notification).toBe(0);
    t.clients[1].emit('notification', {});
    expect(t.calls.notification).toBe(1);
  });

  it('an end without an error is a lost connection too', async () => {
    const t = setUp();
    await t.listener.start();
    t.clients[0].emit('end');
    expect(t.waits()).toEqual([1000]);
    expect(t.logs.warning).toEqual([
      'Lost the connection that listens for "new_event" (the connection ended). Listening again in 1 s.'
    ]);
  });

  it('waits 1, 2, 5, then 10 s between failed attempts, and logs them for debugging only', async () => {
    const t = setUp([
      {},
      { connectError: refused() },
      { connectError: refused() },
      { connectError: refused() },
      { connectError: refused() }
    ]);
    await t.listener.start();
    t.clients[0].emit('error', adminShutdown());
    for (let i = 0; i < 4; i += 1) {
      await t.fireLastTimer();
    }
    expect(t.waits()).toEqual([1000, 2000, 5000, 10000, 10000]);
    expect(t.logs.warning).toHaveLength(1);
    expect(t.logs.debug).toEqual(
      ['2 s', '5 s', '10 s', '10 s'].map(
        (wait) =>
          `Could not listen for "new_event" (connect ECONNREFUSED 127.0.0.1:5432). Trying again in ${wait}.`
      )
    );
    expect(t.clients.slice(1).every((client) => client.ended)).toBe(true);
    expect(t.calls.reconnect).toBe(0);
  });

  it('starts the waits again at 1 s once a connection listens again', async () => {
    const t = setUp([{}, { connectError: refused() }, {}]);
    await t.listener.start();
    t.clients[0].emit('error', adminShutdown());
    await t.fireLastTimer();
    await t.fireLastTimer();
    expect(t.calls.reconnect).toBe(1);
    t.clients[2].emit('error', adminShutdown());
    expect(t.waits()).toEqual([1000, 2000, 1000]);
  });

  it('a first attempt that fails at start does not throw, and is tried again', async () => {
    const t = setUp([{ connectError: refused() }]);
    await expect(t.listener.start()).resolves.toBeUndefined();
    expect(t.waits()).toEqual([1000]);
    await t.fireLastTimer();
    expect(t.clients[1].queries).toEqual(['LISTEN new_event']);
    // It never listened before, so nothing was missed: no drain, no "again".
    expect(t.calls.reconnect).toBe(0);
    expect(t.logs.warning).toEqual([]);
  });

  it('a LISTEN that fails counts as a failed attempt', async () => {
    const t = setUp([
      { queryError: new Error('the database system is starting up') }
    ]);
    await t.listener.start();
    expect(t.clients[0].ended).toBe(true);
    expect(t.waits()).toEqual([1000]);
    expect(t.logs.debug).toEqual([
      'Could not listen for "new_event" (the database system is starting up). Trying again in 1 s.'
    ]);
  });

  it('stop() cancels a waiting attempt, and drops the client it listens on', async () => {
    const waiting = setUp();
    await waiting.listener.start();
    waiting.clients[0].emit('error', adminShutdown());
    waiting.listener.stop();
    expect(waiting.timers[0].cleared).toBe(true);
    // Even if the wait still fired, nothing would connect.
    await waiting.fireLastTimer();
    expect(waiting.clients).toHaveLength(1);

    const listening = setUp();
    await listening.listener.start();
    listening.listener.stop();
    expect(listening.clients[0].ended).toBe(true);
    expect(() =>
      listening.clients[0].emit('error', adminShutdown())
    ).not.toThrow();
    expect(listening.waits()).toEqual([]);
  });
});
