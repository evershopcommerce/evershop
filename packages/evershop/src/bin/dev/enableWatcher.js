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
        '**/build/**',
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
