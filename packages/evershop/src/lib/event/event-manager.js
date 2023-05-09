const { select, del } = require('@evershop/postgres-query-builder');
const { loadSubscribers } = require('./loadSubscribers');
const { callSubscribers } = require('./callSubscibers');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

const loadEventInterval = 5000;
const syncEventInterval = 2000;
const maxEvents = 10;
let events = [];
let subscribers = loadSubscribers();

setInterval(async () => {
  // Load events
  const newEvents = await loadEvents(maxEvents);
  // Append the new events to the existing events
  events = [...events, ...newEvents];

  // Keep only the last 20 events
  events = events.slice(-maxEvents);

  // Call subscribers for each event
  events.forEach((event) => {
    if (event.status === 'done' || event.status === 'processing') {
      return;
    } else {
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
  const eventNames = subscribers.map((subscriber) => {
    return subscriber.event;
  });

  const query = select().from('event');
  if (eventNames.length > 0) {
    query.where('name', 'IN', eventNames);
  }

  if (events.length > 0) {
    query.and(
      'uuid',
      'NOT IN',
      events.map((event) => {
        return event.uuid;
      })
    );
  }

  query.orderBy('event_id', 'ASC');
  query.limit(0, count);
  return await query.execute(pool);
}

async function syncEvents() {
  // Delete the events that have been executed
  const completedEvents = events
    .filter((event) => {
      return event.status === 'done';
    })
    .map((event) => {
      return event.uuid;
    });
  if (completedEvents.length === 0) {
    return;
  }
  await del('event').where('uuid', 'IN', completedEvents).execute(pool);

  // Remove the events from the events array
  events = events.filter((event) => {
    return event.status !== 'done';
  });
}

async function executeSubscribers(event) {
  event.status = 'processing';
  const eventData = event.data;
  // get subscribers for the event
  const matchingSubscribers = subscribers
    .filter((subscriber) => {
      return subscriber.event === event.name;
    })
    .map((subscriber) => {
      return subscriber.subscriber;
    });
  // Call subscribers
  await callSubscribers(matchingSubscribers, eventData);
  event.status = 'done';
}
