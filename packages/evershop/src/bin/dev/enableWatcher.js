import { subscribe } from '@parcel/watcher';
import { CONSTANTS } from '../../lib/helpers.js';
import { watchHandler } from '../lib/watch/watchHandler.js';

export default async function enableWatcher() {
  const watcherInstance = await subscribe(
    CONSTANTS.ROOTPATH,
    (err, events) => {
      if (err) {
        return;
      }
      watchHandler(events);
    },
    {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        // compileSwc's temp output — compiled files land here before being
        // swapped into dist; without this the swap right before/around boot
        // floods the watcher and the effects run against half-built paths.
        '**/dist.compiling/**',
        '**/build/**',
        // Runtime-written directories: the sitemap cron rewrites public/*.xml
        // on schedule and uploads land in media/. Neither needs compilation
        // or a dev-server effect, and an event from them during the boot
        // window used to crash the bootstrap (see detectEffect).
        '**/public/**',
        '**/media/**',
        '**/.git/**',
        '**/.cache/**',
        '**/.next/**',
        '**/.nuxt/**',
        '**/.vscode/**'
      ]
    }
  );

  process.on('SIGINT', () => {
    watcherInstance.unsubscribe();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    watcherInstance.unsubscribe();
  });
  process.on('exit', () => {
    watcherInstance.unsubscribe();
  });
}
