const { select, del } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { loadSubscribers } = require('./loadSubscribers');
const { callSubscribers } = require('./callSubscibers');

const loadEventInterval = 5000;
const syncEventInterval = 2000;
const maxEvents = 10;
let events = [];
const subscribers = loadSubscribers();

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
