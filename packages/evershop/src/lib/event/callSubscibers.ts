import { error } from '../../lib/log/logger.js';

export async function callSubscribers(subscribers, eventData, meta?) {
  await Promise.all(
    subscribers.map(async (subscriber) => {
      try {
        // `meta` is only passed when provided, so a subscriber that ignores
        // it sees exactly the arguments it always did.
        if (meta === undefined) {
          await subscriber(eventData);
        } else {
          await subscriber(eventData, meta);
        }
      } catch (e) {
        error(e);
      }
    })
  );
}
