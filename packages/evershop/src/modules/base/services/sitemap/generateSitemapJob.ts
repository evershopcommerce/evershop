import { generateSitemap } from './generateSitemap.js';

/**
 * Cron entry point. Regenerates the sitemap when the change-fingerprint has moved (or the max-age
 * backstop has elapsed) — a no-op otherwise. Registered as the `generateSitemap` job in
 * `base/bootstrap.js`; the runner calls this default export with no arguments in the cron child.
 */
export default async function runSitemapJob(): Promise<void> {
  await generateSitemap({ force: false });
}
