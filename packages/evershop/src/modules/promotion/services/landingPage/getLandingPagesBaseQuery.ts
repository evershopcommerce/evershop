import { select } from '@evershop/postgres-query-builder';

/**
 * Base query for landing pages. Single table — no `_description` join (landing
 * pages have no i18n dimension), so `url_key`/`name`/SEO live directly on the row.
 * Reused by the collection, the single-page resolver, and the storefront handler.
 */
export const getLandingPagesBaseQuery = () => select().from('landing_page');
