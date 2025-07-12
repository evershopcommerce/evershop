import { del, select } from '@evershop/postgres-query-builder';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { loadBootstrapScript } from '../../bin/lib/bootstrap/bootstrap.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { pool } from '../../lib/postgres/connection.js';
import { debug, error } from '../log/logger.js';
import { lockHooks } from '../util/hookable.js';
import { lockRegistry } from '../util/registry.js';
import { callSubscribers } from './callSubscibers.js';
import { loadSubscribers } from './loadSubscribers.js';

const loadEventInterval = 10000;
const syncEventInterval = 2000;
const maxEvents = 10;
let events = [];
// Get the modules from the arguments
const modules = [...getCoreModules(), ...getEnabledExtensions()];
const subscribers = await loadSubscribers(modules);

const init = async () => {
  /** Loading bootstrap script from modules */
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
  process.env.ALLOW_CONFIG_MUTATIONS = false;
  setInterval(async () => {
    // Load events
    const newEvents = await loadEvents(maxEvents);
    // Append the new events to the existing events
    events = [...events, ...newEvents];

    // Keep only the last 20 events
    events = events.slice(-maxEvents);

    // Call subscribers for each event
    events.forEach((event) => {
      if (event.status !== 'done' && event.status !== 'processing') {
        executeSubscribers(event);
      }
    });
  }, loadEventInterval);
};

setInterval(async () => {
  // Sync events
  await syncEvents();
}, syncEventInterval);

async function loadEvents(count) {
  // Only load events if the current events are less than the max events
  if (events.length >= maxEvents) {
    return [];
  }
  // Only load events that have subscribers
  const eventNames = subscribers.map((subscriber) => subscriber.event);

  const query = select().from('event');
  if (eventNames.length > 0) {
    query.where('name', 'IN', eventNames);
  }

  if (events.length > 0) {
    query.andWhere(
      'uuid',
      'NOT IN',
      events.map((event) => event.uuid)
    );
  }

  query.orderBy('event_id', 'ASC');
  query.limit(0, count);

  const results = await query.execute(pool);
  return results;
}

async function syncEvents() {
  // Delete the events that have been executed
  const completedEvents = events
    .filter((event) => event.status === 'done')
    .map((event) => event.uuid);
  if (completedEvents.length > 0) {
    await del('event').where('uuid', 'IN', completedEvents).execute(pool);
    // Remove the events from the events array
    events = events.filter((event) => event.status !== 'done');
  }
}

async function executeSubscribers(event) {
  event.status = 'processing';
  const eventData = event.data;
  // get subscribers for the event
  const matchingSubscribers = subscribers
    .filter((subscriber) => subscriber.event === event.name)
    .map((subscriber) => subscriber.subscriber);
  // Call subscribers
  await callSubscribers(matchingSubscribers, eventData);

  event.status = 'done';
}

process.on('SIGTERM', async () => {
  debug('Event manager received SIGTERM, shutting down...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown:');
    error(err);
    process.exit(1); // Exit with an error code
  }
});

process.on('SIGINT', async () => {
  debug('Event manager received SIGINT, shutting down...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown:');
    error(err);
    process.exit(1); // Exit with an error code
  }
});

init();
