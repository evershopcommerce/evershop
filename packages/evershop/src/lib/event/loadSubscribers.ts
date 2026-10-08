import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { error } from '../../lib/log/logger.js';
import {
  WILDCARD_EVENT,
  WILDCARD_FOLDER,
  type EventMeta
} from './subscriber.js';

type Subscriber = {
  event: string;
  subscriber: (data: unknown, meta?: EventMeta) => void | Promise<void>;
};

type Module = {
  path: string;
  [key: string]: unknown;
};

async function loadModuleSubscribers(
  modulePath: string
): Promise<Subscriber[]> {
  const subscribers: Subscriber[] = [];
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
          const mod = await import(pathToFileURL(subscriberPath).toString());
          subscribers.push({
            // `subscribers/_all/` receives every event.
            event: eventName === WILDCARD_FOLDER ? WILDCARD_EVENT : eventName,
            subscriber: mod.default
          });
        })
      );
    })
  );

  return subscribers;
}

export async function loadSubscribers(
  modules: Module[]
): Promise<Subscriber[]> {
  const subscribers: Subscriber[] = [];
  await Promise.all(
    modules.map(async (module) => {
      try {
        subscribers.push(...(await loadModuleSubscribers(module.path)));
      } catch (e) {
        error(e);
        process.exit(0);
      }
    })
  );
  return subscribers;
}
