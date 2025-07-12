import { error } from '../../lib/log/logger.js';

export async function callSubscribers(subscribers, eventData) {
  const promises = subscribers.map(
    (subscriber) =>
      new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await subscriber(eventData);
          } catch (e) {
            error(e);
          }
          resolve();
        }, 0);
      })
  );

  await Promise.all(promises);
}
