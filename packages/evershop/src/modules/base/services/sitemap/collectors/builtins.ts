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
      where:
        'e.status = true AND COALESCE(e.publish_start, NOW()) <= NOW() AND COALESCE(e.publish_end, NOW()) >= NOW()',
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
