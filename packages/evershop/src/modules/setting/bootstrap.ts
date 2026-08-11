import { debug, error } from '../../lib/log/logger.js';
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
    // Postgres 42P01 (undefined_table) is the EXPECTED state on a brand-new database:
    // bootstraps run before migrations, so on the very first boot the `setting` table
    // does not exist yet. Logging it as an error makes every fresh install look like a
    // crash. Anything else (connection refused, bad credentials, …) is a real problem
    // and keeps the loud path.
    if ((e as { code?: string })?.code === '42P01') {
      debug(
        'Setting cache warm-up skipped: the setting table is not migrated yet (fresh install). The cache will load after migrations run.'
      );
    } else {
      error(e);
    }
  }
};
