import { localizeUrl } from '../../../../lib/locale/localeContext.js';
import { select } from '../../../../lib/postgres/query.js';
import {
  linkLoaderFromBatch,
  registerLinkLoader
} from '../../../../lib/widget/linkResolver.js';

/**
 * Resolve `urn:evershop:promotion:landing_page:<uuid>` widget links (produced by
 * the LinkPicker's "Landing page" tab) to the page's current root URL
 * `/<url_key>` at request time, batched per request. Mirrors the built-in
 * cms:page loader (services/lib/widget/linkResolver.ts). Status-independent — a
 * link to a draft resolves to its URL, which 404s to the public until the page
 * is published, exactly like a CMS-page link. The `promotion:landing_page` URN
 * schema is already registered in lib/urn, which `registerLinkLoader` requires.
 *
 * Called from the promotion bootstrap (the value registry locks afterwards).
 */
export function registerLandingPageLinkLoader(): void {
  registerLinkLoader(
    'promotion',
    'landing_page',
    linkLoaderFromBatch(async (uuids, pool) => {
      if (uuids.length === 0) {
        return [];
      }
      const rows = await select('uuid', 'url_key')
        .from('landing_page')
        .where('uuid', 'IN', [...uuids])
        .execute(pool);
      const m = new Map<string, string>(
        rows.map((r: any) => [r.uuid, localizeUrl(`/${r.url_key}`)])
      );
      return uuids.map((u) => m.get(u) ?? null);
    })
  );
}
