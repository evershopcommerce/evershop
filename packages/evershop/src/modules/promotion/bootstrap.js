import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../lib/postgres/connection.js';
import { PromotionUrn } from '../../lib/urn/index.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { registerEntityScope } from '../../lib/util/entityScopeRegistry.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerLandingPageLinkLoader } from './services/landingPage/registerLandingPageLinkLoader.js';
import { registerCartItemPromotionFields } from './services/registerCartItemPromotionFields.js';
import { registerCartPromotionFields } from './services/registerCartPromotionFields.js';
import { registerDefaultCalculators } from './services/registerDefaultCalculators.js';
import { registerDefaultCouponCollectionFilters } from './services/registerDefaultCouponCollectionFilters.js';
import { registerDefaultLandingPageCollectionFilters } from './services/registerDefaultLandingPageCollectionFilters.js';
import { registerDefaultValidators } from './services/registerDefaultValidators.js';

export default () => {
  addProcessor(
    'couponLoaderFunction',
    () => async (couponCode) => {
      const coupon = await select()
        .from('coupon')
        .where('coupon', '=', couponCode)
        .load(pool);
      return coupon;
    },
    0
  );
  addProcessor('cartFields', registerCartPromotionFields, 0);
  addProcessor('cartItemFields', registerCartItemPromotionFields, 11);
  addProcessor('couponValidatorFunctions', registerDefaultValidators);
  addProcessor('discountCalculatorFunctions', registerDefaultCalculators);

  // Reigtering the default filters for attribute collection
  addProcessor(
    'couponCollectionFilters',
    registerDefaultCouponCollectionFilters,
    1
  );
  addProcessor(
    'couponCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Landing page grid filters
  addProcessor(
    'landingPageCollectionFilters',
    registerDefaultLandingPageCollectionFilters,
    1
  );
  addProcessor(
    'landingPageCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Resolve landing-page widget links (LinkPicker "Landing page" tab) at
  // request time: urn:evershop:promotion:landing_page:<uuid> -> /<url_key>.
  registerLandingPageLinkLoader();

  // Register landing pages as a page-builder entity scope: the editor gains a
  // per-landing-page selector and scopes widget placements to entity_urn. The
  // page-builder resolves this generically via the registry (no hardcoding).
  registerEntityScope({
    routeId: 'landingPageView',
    entityType: 'landing_page',
    resolve: async (uuid, conn) => {
      const lp = await select()
        .from('landing_page')
        .where('uuid', '=', uuid)
        .load(conn);
      return lp
        ? {
            urn: PromotionUrn.landingPage(uuid),
            previewPath: `/${lp.url_key}`
          }
        : null;
    },
    list: async (conn) => {
      // No status filter: drafts must appear in the selector so a merchant can
      // open and build them before publishing (the editor badges drafts and can
      // preview them via the changeset token — see landingPageView).
      const rows = await select().from('landing_page').execute(conn);
      return (
        rows
          .map((r) => ({
            uuid: r.uuid,
            name: r.name,
            urlKey: r.url_key,
            urn: PromotionUrn.landingPage(r.uuid),
            status: r.status === true
          }))
          // Published first, then alphabetical. Sorted here, NOT via two
          // orderBy() calls: the query builder's OrderBy holds a single column,
          // so a second orderBy() silently overwrites the first.
          .sort(
            (a, b) =>
              Number(b.status) - Number(a.status) || a.name.localeCompare(b.name)
          )
      );
    }
  });
};
