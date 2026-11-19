import { Client } from 'pg';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { headlessBoot } from '../../bin/lib/bootstrap/headlessBoot.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { pool, connectionSetting } from '../../lib/postgres/connection.js';
import { refreshSetting } from '../../modules/setting/services/setting.js';
import { debug, error, warning } from '../log/logger.js';
import { createEventProcessor } from './EventProcessor.js';
import { EventStorage } from './EventStorage.js';
import { loadSubscribers } from './loadSubscribers.js';
import { createNotificationListener } from './NotificationListener.js';

const POLL_INTERVAL = 10000;

const modules = [...getCoreModules(), ...getEnabledExtensions()];
const subscribers = await loadSubscribers(modules);

const storage = new EventStorage(pool);
// Refresh this process's settings cache before each non-empty batch so emails reflect
// admin setting changes (locale/store name/address) without a restart. (Upgrade path:
// a pg_notify('setting_changed') channel for real-time, all-process invalidation.)
const { loadAndProcess } = createEventProcessor({
  storage,
  subscribers,
  beforeBatch: refreshSetting
});

const init = async () => {
  try {
    // Every module's bootstrap, then the hook, registry and address-registry
    // locks, then the routes, so subscribers can build URLs (`buildUrl`,
    // `buildAbsoluteUrl`) instead of writing them by hand. No extra settings
    // load is asked for: the setting module's bootstrap warms the cache, and
    // it is refreshed before each batch of events (`beforeBatch` above).
    await headlessBoot({
      modules,
      context: {
        ...JSON.parse(process.env.bootstrapContext || '{}'),
        process: 'event'
      },
      loadRoutes: true
    });
  } catch (e) {
    error(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = 'false';

  // Wake up on pg_notify('new_event'), on a dedicated client: pool connections
  // come and go and cannot keep a LISTEN. When that connection breaks (the
  // database restarts), the listener opens a new one and then drains what was
  // written meanwhile; the poll below keeps processing events in between. It
  // used to exit the process here, and nothing started the process again.
  const listener = createNotificationListener({
    createClient: () => new Client(connectionSetting),
    channel: 'new_event',
    onNotification: () => {
      debug('Received pg_notify(new_event), waking up event processor');
      loadAndProcess().catch((e) => error(e));
    },
    onReconnect: () => {
      loadAndProcess().catch((e) => error(e));
    },
    log: { warning, debug }
  });
  await listener.start();

  // Fallback poll: catches events inserted before LISTEN was ready, or missed notifications
  setInterval(() => {
    loadAndProcess().catch((e) => error(e));
  }, POLL_INTERVAL);

  // Mark events stuck as 'processing' from a previous crash as 'failed'.
  // At-most-once delivery: subscribers are never called twice, failed events
  // remain visible in the table for operator inspection.
  const stuckCount = await storage.markStuckAsFailed();
  if (stuckCount > 0) {
    error(
      `Marked ${stuckCount} stuck event(s) as failed — they were interrupted by a previous crash`
    );
  }

  // Drain any events that were pending before this process started
  await loadAndProcess();
};

process.on('SIGTERM', async () => {
  debug('Event manager received SIGTERM, shutting down...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown:');
    error(err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  debug('Event manager received SIGINT, shutting down...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown:');
    error(err);
    process.exit(1);
  }
});

init();
