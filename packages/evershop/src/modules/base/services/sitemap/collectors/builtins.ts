import { getActiveTheme } from '../../../../../lib/util/getActiveTheme.js';
import { SitemapConfig, getSitemapConfig } from '../config.js';
import { SitemapCollector } from '../types.js';
import { createEntityCollector } from './entityCollector.js';
import { createStaticCollector } from './staticCollector.js';

/**
 * The five built-in collectors, assembled from config. Registered at bootstrap (P5). Enumeration
 * rules and status filters per design §3.3:
 *  - products      status = true AND visibility = true
 *  - categories    status = true                       (menu visibility is NOT a gate)
 *  - cms-pages     status = true                       (default NULL ⇒ unpublished excluded)
 *  - landing-pages status = true AND within the publish window (NULL bounds ⇒ open-ended)
 *  - static        config `staticPaths` (default `/`)
 *
 * Collector `name`s double as child-file basenames (`sitemap-<name>.xml`), so they stay URL-safe.
 */
/**
 * The active theme as a SQL literal, for the trusted-constant `where` strings
 * the collector spec interpolates. `config.system.theme` is validated by
 * `assertValidThemeId` wherever it is written; quoted here regardless.
 */
function activeThemeLiteral(): string {
  const theme = getActiveTheme();
  if (theme === null || theme === undefined) return 'NULL';
  return `'${String(theme).replace(/'/g, "''")}'`;
}

export function getBuiltinSitemapCollectors(
  config: SitemapConfig = getSitemapConfig()
): SitemapCollector[] {
  const { changefreq, priority } = config;
  return [
    createEntityCollector({
      name: 'products',
      table: 'product',
      entityType: 'product',
      where: 'e.status = true AND e.visibility = true',
      changefreq: changefreq.product,
      priority: priority.product
    }),
    createEntityCollector({
      name: 'categories',
      table: 'category',
      entityType: 'category',
      where: 'e.status = true',
      changefreq: changefreq.category,
      priority: priority.category
    }),
    createEntityCollector({
      name: 'cms-pages',
      table: 'cms_page',
      entityType: 'cms_page',
      where: 'e.status = true',
      changefreq: changefreq.cmsPage,
      priority: priority.cmsPage
    }),
    createEntityCollector({
      name: 'landing-pages',
      table: 'landing_page',
      entityType: 'landing_page',
      // Published, in its publish window, AND with something to show under the
      // ACTIVE theme: a landing page's body is theme-bucketed placements, so a
      // page built under another theme — or shipped by a theme that is no
      // longer active — renders header + footer and nothing else. Advertising
      // those URLs would publish a set of empty pages after every theme switch.
      where:
        'e.status = true AND COALESCE(e.publish_start, NOW()) <= NOW() AND COALESCE(e.publish_end, NOW()) >= NOW() ' +
        'AND EXISTS (SELECT 1 FROM widget_placement wp ' +
        '            JOIN widget_instance wgi ON wgi.widget_instance_id = wp.widget_instance_id ' +
        "            WHERE wp.entity_urn = 'urn:evershop:promotion:landing_page:' || e.uuid::text " +
        `              AND wp.theme IS NOT DISTINCT FROM ${activeThemeLiteral()} ` +
        '              AND wgi.status = TRUE)',
      changefreq: changefreq.landingPage,
      priority: priority.landingPage
    }),
    createStaticCollector({
      paths: config.staticPaths,
      changefreq: changefreq.static,
      priority: priority.static
    })
  ];
}
