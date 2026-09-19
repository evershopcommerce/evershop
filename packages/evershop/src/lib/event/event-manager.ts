import { Client } from 'pg';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { loadBootstrapScript } from '../../bin/lib/bootstrap/bootstrap.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { pool, connectionSetting } from '../../lib/postgres/connection.js';
import { refreshSetting } from '../../modules/setting/services/setting.js';
import { debug, error } from '../log/logger.js';
import { lockHooks } from '../util/hookable.js';
import { lockRegistry } from '../util/registry.js';
import { createEventProcessor } from './EventProcessor.js';
import { EventStorage } from './EventStorage.js';
import { loadSubscribers } from './loadSubscribers.js';

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
    for (const module of modules) {
      await loadBootstrapScript(module, {
        ...JSON.parse(process.env.bootstrapContext || '{}'),
        process: 'event'
      });
    }
    lockHooks();
    lockRegistry();
  } catch (e) {
    error(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = 'false';

  // Dedicated client for LISTEN — pool connections are transient and cannot
  // maintain a persistent LISTEN registration
  const listenClient = new Client(connectionSetting);
  await listenClient.connect();
  await listenClient.query('LISTEN new_event');

  listenClient.on('notification', () => {
    debug('Received pg_notify(new_event), waking up event processor');
    loadAndProcess().catch((e) => error(e));
  });

  // If the LISTEN connection drops, restart the process — the parent will respawn it
  listenClient.on('error', (e) => {
    error('LISTEN client error, restarting event-manager process:');
    error(e);
    process.exit(1);
  });

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
