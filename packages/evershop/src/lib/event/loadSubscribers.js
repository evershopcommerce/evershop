import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { error } from '../../lib/log/logger.js';

async function loadModuleSubscribers(modulePath) {
  const subscribers = [];
  const subscribersDir = path.join(modulePath, 'subscribers');

  if (!fs.existsSync(subscribersDir)) {
    return subscribers;
  }

  const eventDirs = fs
    .readdirSync(subscribersDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  await Promise.all(
    eventDirs.map(async (eventName) => {
      const eventSubscribersDir = path.join(subscribersDir, eventName);

      // get only .js files
      const files = fs
        .readdirSync(eventSubscribersDir, { withFileTypes: true })
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js'))
        .map((dirent) => dirent.name);

      await Promise.all(
        files.map(async (file) => {
          const subscriberPath = path.join(eventSubscribersDir, file);
          const module = await import(pathToFileURL(subscriberPath));
          subscribers.push({
            event: eventName,
            subscriber: module.default
          });
        })
      );
    })
  );

  return subscribers;
}

export async function loadSubscribers(modules) {
  const subscribers = [];
  /** Loading subscriber  */
  await Promise.all(
    modules.map(async (module) => {
      try {
        // Load subscribers
        subscribers.push(...(await loadModuleSubscribers(module.path)));
      } catch (e) {
        error(e);
        process.exit(0);
      }
    })
  );
  return subscribers;
}
