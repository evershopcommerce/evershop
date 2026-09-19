import { error } from '../../lib/log/logger.js';

export async function callSubscribers(subscribers, eventData) {
  await Promise.all(
    subscribers.map(async (subscriber) => {
      try {
        await subscriber(eventData);
      } catch (e) {
        error(e);
      }
    })
  );
}
