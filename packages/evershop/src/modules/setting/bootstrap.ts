import { error } from '../../lib/log/logger.js';
import { refreshSetting } from './services/setting.js';

export default async () => {
  // Warm the in-memory setting cache so the synchronous accessors (`getSettingSync` and the
  // `*Sync` getters) are reliable from the first request onward — the pricing formatter,
  // email Handlebars helpers and metafield schema builders all read settings synchronously.
  // Runs in every process that loads module bootstraps (HTTP, cron, subscriber).
  //
  // A failure here is non-fatal: on a fresh install the `setting` table may not be migrated
  // yet, in which case the async `getSetting` path lazy-loads the cache on first use instead.
  try {
    await refreshSetting();
  } catch (e) {
    error(e);
  }
};
