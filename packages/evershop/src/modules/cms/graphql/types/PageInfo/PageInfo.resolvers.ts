import { access } from 'fs/promises';
import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../../../../lib/helpers.js';
import {
  getActiveLocale,
  getLocaleContext,
  localizeUrl
} from '../../../../../lib/locale/localeContext.js';
import { buildHreflangAlternates } from '../../../../../lib/locale/localeResolution.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { get } from '../../../../../lib/util/get.js';
import { getBaseUrl } from '../../../../../lib/util/getBaseUrl.js';
import { getValueSync } from '../../../../../lib/util/registry.js';
import { OgInfo } from '../../../../../types/pageMeta.js';
import { getSetting } from '../../../../setting/services/setting.js';

export default {
  Query: {
    pageInfo: async (root, args, context) => ({
      url: get(context, 'currentUrl'),
      // Resolved request locale — feeds <html lang>-parity for og:locale (root.locale
      // fallback in the ogInfo resolver) and the PageInfo.locale field.
      locale: getActiveLocale(),
      title: get(
        context,
        'pageInfo.title',
        await getSetting('storeName', 'Evershop')
      ),
      description: get(context, 'pageInfo.description', ''),
      keywords: get(context, 'pageInfo.keywords', []),
      canonicalUrl: get(
        context,
        'pageInfo.canonicalUrl',
        get(context, 'currentUrl')
      ),
      favicon: async () => {
        // Admin-uploaded favicon wins; HeadTags derives the sized link tags.
        const fav = await getSetting<string>('favicon', '');
        if (fav) {
          return fav;
        }
        // Otherwise fall back to a favicon.ico dropped in the public folder.
        try {
          await access(path.resolve(CONSTANTS.PUBLICPATH, 'favicon.ico'));
          return getBaseUrl() + '/assets/favicon.ico';
        } catch (error) {
          return null;
        }
      }
    })
  },
  PageInfo: {
    // hreflang alternates (spec §6.17): one absolute URL per enabled locale (prefix swap,
    // shared slugs) + x-default. [] for single-locale / admin (available is [locale] there).
    alternates: (root, args, context) => {
      const ctx = getLocaleContext();
      if (!ctx) {
        return [];
      }
      // Pass the full request URL (query included) so each alternate matches the page's
      // own query-bearing canonical (canonicalUrl = currentUrl = baseUrl + originalUrl).
      return buildHreflangAlternates(
        context.originalUrl || '/',
        ctx.defaultLocale,
        ctx.available,
        getBaseUrl()
      );
    },
    breadcrumbs: async (root, args, context) => {
      // Pages may pre-set their own breadcrumbs via setPageMetaInfo; honor them.
      const presetCrumbs = get(context, 'pageInfo.breadcrumbs');
      if (Array.isArray(presetCrumbs) && presetCrumbs.length > 0) {
        return presetCrumbs;
      }
      // Strip query string first — in page-builder preview the URL carries
      // `?changeset=…&ajax=true`, so `originalUrl === '/'` would never match
      // and the homepage would render a breadcrumb that production doesn't.
      let urlPath = (context.originalUrl ?? '').split('?')[0];
      // Strip the /<locale> prefix so the url_rewrite lookup matches the canonical
      // (unprefixed) request_path on a non-default-locale page (spec §6.18). No-op for
      // the default locale / off-request. NOTE: breadcrumb item URLs are localized in P6.
      const localeCtx = getLocaleContext();
      if (localeCtx && localeCtx.locale !== localeCtx.defaultLocale) {
        const prefix = `/${localeCtx.locale}`;
        if (urlPath === prefix) {
          urlPath = '/';
        } else if (urlPath.startsWith(`${prefix}/`)) {
          urlPath = urlPath.slice(prefix.length);
        }
      }
      // Check if the current page is home page
      if (urlPath === '/' || urlPath === '') {
        return [];
      }
      // Get the current path
      const path = urlPath.replace(/^\/|\/$/g, '').replace(/\./g, '');

      // Check if the path is existed in the url_rewrite table
      const rewriteRule = await select()
        .from('url_rewrite')
        .where('request_path', '=', `/${path}`)
        .load(context.pool);
      if (!rewriteRule) {
        return [
          {
            title: translate('Home'),
            url: localizeUrl('/')
          },
          {
            title: get(context, 'pageInfo.title', ''),
            url: get(context, 'currentUrl')
          }
        ];
      } else {
        // Split the target path and remove the last element
        const paths = rewriteRule.request_path.split('/');
        paths.pop();
        // Each element is represented for a category (url_key)
        // Build the breadrumbs
        const breadcrumbs = [
          {
            title: translate('Home'),
            url: localizeUrl('/')
          }
        ];
        for (let i = 0; i < paths.length; i += 1) {
          if (paths[i] === '') {
            continue;
          }
          const urlKey = paths[i];
          const categoryQuery = select().from('category');
          categoryQuery
            .leftJoin('category_description')
            .on(
              'category_description.category_description_category_id',
              '=',
              'category.category_id'
            );
          categoryQuery.where('category_description.url_key', '=', urlKey);
          const category = await categoryQuery.load(context.pool);
          if (category) {
            breadcrumbs.push({
              title: category.name,
              // Canonical (unprefixed) url_rewrite path → add the locale prefix.
              url: localizeUrl(`${paths.slice(0, i + 1).join('/')}`)
            });
          } else {
            continue;
          }
        }

        breadcrumbs.push({
          title: get(context, 'pageInfo.title', ''),
          url: get(context, 'currentUrl')
        });

        return breadcrumbs;
      }
    },
    ogInfo: async (root, args, context): Promise<OgInfo> => {
      const baseUrl = getBaseUrl();
      // Prefer the admin "social sharing image"; otherwise fall back to the logo
      // (admin setting → themeConfig). The (relative) value is passed as the
      // `/images` source so the processor reads it locally, while the og:image
      // meta value itself stays absolute as social crawlers require.
      const social = await getSetting<string>('socialSharingImage', '');
      const logoSrc = await getSetting<string>('logo', '');
      const buildImage = (src: string, params: string) =>
        `${baseUrl}/images?src=${encodeURIComponent(src)}&${params}`;
      const socialImage = social ? buildImage(social, 'w=1200&q=80&f=jpeg') : '';
      const logoImage = logoSrc
        ? buildImage(logoSrc, 'w=1200&q=80&h=675&f=png')
        : '';
      const image = get(
        context,
        'pageInfo.ogInfo.image',
        socialImage || logoImage
      );
      // A dedicated social image (or a page-level override) earns the large
      // Twitter card; the bare logo fallback stays a small summary card.
      const hasRichImage =
        Boolean(social) || Boolean(get(context, 'pageInfo.ogInfo.image'));

      return getValueSync<OgInfo>(
        'ogInfo',
        {
          title: get(context, 'pageInfo.ogTitle', root.title),
          description: get(
            context,
            'pageInfo.ogInfo.description',
            root.description
          ),
          image: get(
            context,
            'pageInfo.ogInfo.image',
            image ? image : root.image
          ),
          url: get(context, 'pageInfo.ogInfo.url', root.url),
          siteName: get(context, 'pageInfo.ogInfo.siteName', root.siteName),
          type: get(context, 'pageInfo.ogInfo.type', 'website'),
          locale: get(context, 'pageInfo.ogInfo.locale', root.locale),
          twitterCard: get(
            context,
            'pageInfo.ogInfo.twitterCard',
            hasRichImage ? 'summary_large_image' : 'summary'
          ),
          twitterSite: get(
            context,
            'pageInfo.ogInfo.twitterSite',
            await getSetting('storeName', 'Evershop')
          ),
          twitterCreator: get(
            context,
            'pageInfo.ogInfo.twitterCreator',
            await getSetting('storeName', 'Evershop')
          ),
          twitterImage: get(context, 'pageInfo.ogInfo.twitterImage', image),
          publishedTime: get(
            context,
            'pageInfo.ogInfo.publishedTime',
            undefined
          ),
          authors: get(context, 'pageInfo.ogInfo.authors', undefined),
          tags: get(context, 'pageInfo.ogInfo.tags', undefined)
        },
        context
      );
    }
  }
};
