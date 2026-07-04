import { localizeUrl } from '../../../../../lib/locale/localeContext.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { PromotionUrn } from '../../../../../lib/urn/index.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getLandingPagesBaseQuery } from '../../../services/landingPage/getLandingPagesBaseQuery.js';
import { LandingPageCollection } from '../../../services/LandingPageCollection.js';

export default {
  Query: {
    landingPage: async (_: unknown, { id }: { id: number }, { pool }: any) => {
      const query = getLandingPagesBaseQuery();
      query.where('landing_page_id', '=', id);
      const landingPage = await query.load(pool);
      return landingPage ? camelCase(landingPage) : null;
    },
    landingPages: async (
      _: unknown,
      { filters = [] }: { filters?: any[] },
      { user }: any
    ) => {
      // Admin-only — mirror `coupons`: anonymous callers get an empty list.
      if (!user) {
        return [];
      }
      const query = getLandingPagesBaseQuery();
      const root = new LandingPageCollection(query);
      await root.init(filters, !!user);
      return root;
    }
  },
  LandingPage: {
    url: ({ urlKey }: { urlKey: string }) => localizeUrl(`/${urlKey}`),
    editUrl: ({ uuid }: { uuid: string }) =>
      buildUrl('landingPageEdit', { id: uuid }),
    updateApi: ({ uuid }: { uuid: string }) =>
      buildUrl('updateLandingPage', { id: uuid }),
    deleteApi: ({ uuid }: { uuid: string }) =>
      buildUrl('deleteLandingPage', { id: uuid }),
    duplicateApi: ({ uuid }: { uuid: string }) =>
      buildUrl('duplicateLandingPage', { id: uuid }),
    pageBuilderUrl: ({ uuid }: { uuid: string }) =>
      `${buildUrl('pageBuilderEdit', {
        routeId: 'landingPageView'
      })}?entity=${uuid}`,
    urn: ({ uuid }: { uuid: string }) => PromotionUrn.landingPage(uuid)
  }
};
