import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { getSetting } from '../../../../setting/services/setting.js';
import { SitemapConfig, getSitemapConfig } from '../../../services/sitemap/config.js';
import { ensureSitemap } from '../../../services/sitemap/ensureSitemap.js';
import { renderRobotsTxt } from '../../../services/sitemap/render/renderRobotsTxt.js';

/** Root-level sitemap files: `/sitemap.xml`, `/sitemap-products.xml`, … (design §5/§12 C4). */
const SITEMAP_FILE_RE = /^\/sitemap(-[a-z0-9-]+)?\.xml$/;

/**
 * Injectable dependencies, so the handler is unit-testable without a DB / real fs.
 */
export interface ServeSitemapDeps {
  ensureSitemap: (fileName: string) => Promise<Buffer | null>;
  getConfig: () => SitemapConfig;
  /** The `robotsTxt` setting override, or null when unset. */
  getRobotsOverride: () => Promise<string | null>;
  getBaseUrl: () => string;
}

/**
 * Cold-path handler for `/sitemap.xml`, `/sitemap-*.xml` and `/robots.txt`. Fires only on a
 * would-be-404 — when a physical `public/` file exists, `publicStatic` already served it and we
 * never run (wiki/sitemap-design.md §2). Matches the canonical locale-stripped path so
 * `/de/sitemap.xml` resolves too. Active (3-arg): sends the response and returns without `next()`,
 * or calls `next()` to fall through to the 404.
 */
export async function serveSitemapRequest(
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void,
  deps: ServeSitemapDeps
): Promise<void> {
  // Only would-be-404s; a request that matched a real route is left alone.
  if ((request as unknown as { currentRoute?: { id?: string } }).currentRoute?.id !== 'notFound') {
    next();
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    next();
    return;
  }

  const path =
    (request as unknown as { localePath?: string }).localePath ??
    request.originalUrl.split('?')[0];
  const config = deps.getConfig();

  try {
    if (SITEMAP_FILE_RE.test(path)) {
      if (!config.enabled) {
        next();
        return;
      }
      const buffer = await deps.ensureSitemap(path.slice(1)); // strip leading '/'
      if (!buffer) {
        // A sitemap-shaped path that generation doesn't produce ⇒ let it 404.
        next();
        return;
      }
      // Override the 404 the notFound classification already set on the response.
      response.status(200);
      response.set('Content-Type', 'application/xml; charset=utf-8');
      response.set('Cache-Control', 'public, max-age=3600');
      response.send(buffer);
      return;
    }

    if (path === '/robots.txt') {
      if (!config.robots.enabled) {
        next();
        return;
      }
      const override = await deps.getRobotsOverride();
      const body =
        override ??
        renderRobotsTxt({
          sitemapUrl: `${deps.getBaseUrl()}/sitemap.xml`,
          disallow: config.robots.disallow,
          // Don't advertise a sitemap that won't be generated.
          includeSitemap: config.enabled
        });
      // Override the 404 the notFound classification already set on the response.
      response.status(200);
      response.set('Content-Type', 'text/plain; charset=utf-8');
      response.set('Cache-Control', 'public, max-age=3600');
      response.send(body);
      return;
    }

    next();
  } catch (e) {
    next(e);
  }
}

const defaultDeps: ServeSitemapDeps = {
  ensureSitemap: (fileName) => ensureSitemap(fileName),
  getConfig: getSitemapConfig,
  getBaseUrl,
  getRobotsOverride: async () => {
    const value = await getSetting<unknown>('robotsTxt', '');
    return typeof value === 'string' && value.trim() ? value : null;
  }
};

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: unknown) => void
): Promise<void> => serveSitemapRequest(request, response, next, defaultDeps);
