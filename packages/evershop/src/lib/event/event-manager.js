const { select, del } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  loadBootstrapScript
} = require('@evershop/evershop/bin/lib/bootstrap/bootstrap');
const { getCoreModules } = require('@evershop/evershop/bin/lib/loadModules');
const { getEnabledExtensions } = require('@evershop/evershop/bin/extension');
const { callSubscribers } = require('./callSubscibers');
const { loadSubscribers } = require('./loadSubscribers');
const { error } = require('../log/logger');
const { lockHooks } = require('../util/hookable');
const { lockRegistry } = require('../util/registry');

const loadEventInterval = 10000;
const syncEventInterval = 2000;
const maxEvents = 10;
let events = [];
// Get the modules from the arguments
const modules = [...getCoreModules(), ...getEnabledExtensions()];
const subscribers = loadSubscribers(modules);

const init = async () => {
  /** Loading bootstrap script from modules */
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const module of modules) {
      await loadBootstrapScript(module);
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
    query.and(
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
  // eslint-disable-next-line no-param-reassign
  event.status = 'processing';
  const eventData = event.data;
  // get subscribers for the event
  const matchingSubscribers = subscribers
    .filter((subscriber) => subscriber.event === event.name)
    .map((subscriber) => subscriber.subscriber);
  // Call subscribers
  await callSubscribers(matchingSubscribers, eventData);
  // eslint-disable-next-line no-param-reassign
  event.status = 'done';
}

init();
