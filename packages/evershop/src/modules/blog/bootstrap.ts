import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../lib/helpers.js';
import { validateMetafields } from '../../lib/metafield/index.js';
import { buildUrl } from '../../lib/router/buildUrl.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { addProcessor } from '../../lib/util/registry.js';
import {
  linkLoaderFromBatch,
  registerLinkLoader
} from '../../lib/widget/linkResolver.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import {
  createEntityCollector,
  registerSitemapCollector
} from '../base/services/sitemap/index.js';
import { registerDefaultBlogCategoryFilters } from './services/registerDefaultBlogCategoryFilters.js';
import { registerDefaultBlogCommentFilters } from './services/registerDefaultBlogCommentFilters.js';
import { registerDefaultBlogPostFilters } from './services/registerDefaultBlogPostFilters.js';
import { registerDefaultBlogTagFilters } from './services/registerDefaultBlogTagFilters.js';

// Fold an entity's submitted `metafields` into its `meta_data` column on save.
// Runs only when `metafields` is explicitly provided (the edit form sends it),
// so plain API updates that omit it leave `meta_data` untouched. Same pattern
// as catalog/bootstrap.js; the services already run these registry keys and
// `.given()` column-filters, so this is the complete write path.
function makeMetafieldFolder(ownerType: string) {
  return async function foldMetafields(data: Record<string, unknown> | null) {
    if (data && data.metafields !== undefined) {
      (data as Record<string, unknown>).meta_data = await validateMetafields(
        ownerType,
        data.metafields as Record<string, Record<string, unknown>>
      );
    }
    return data;
  };
}

export default (): void => {
  const foldBlogPostMetafields = makeMetafieldFolder('blog_post');
  addProcessor('blogPostDataBeforeCreate', foldBlogPostMetafields);
  addProcessor('blogPostDataBeforeUpdate', foldBlogPostMetafields);
  const foldBlogCategoryMetafields = makeMetafieldFolder('blog_category');
  addProcessor('blogCategoryDataBeforeCreate', foldBlogCategoryMetafields);
  addProcessor('blogCategoryDataBeforeUpdate', foldBlogCategoryMetafields);

  // Sitemap: register blog URLs (posts, categories, tags — all url_rewrite-backed) so they
  // appear in /sitemap.xml. Each becomes a sitemap-blog-<x>.xml child.
  registerSitemapCollector(
    createEntityCollector({
      name: 'blog-posts',
      table: 'blog_post',
      entityType: 'blog_post',
      where: 'e.status = 1', // published
      changefreq: 'weekly',
      priority: 0.5
    })
  );
  registerSitemapCollector(
    createEntityCollector({
      name: 'blog-categories',
      table: 'blog_category',
      entityType: 'blog_category',
      where: 'e.status = 1',
      changefreq: 'weekly',
      priority: 0.4
    })
  );
  registerSitemapCollector(
    createEntityCollector({
      name: 'blog-tags',
      table: 'blog_tag',
      entityType: 'blog_tag',
      updatedAtColumn: 'created_at', // blog_tag has no updated_at
      changefreq: 'monthly',
      priority: 0.3
    })
  );

  // Link loaders: resolve blog URNs → current URLs at request time (prefer the
  // pretty url_rewrite path, fall back to the internal route).
  const blogLinkLoader = (entityType: string, routeId: string) =>
    linkLoaderFromBatch(async (uuids, pool) => {
      if (uuids.length === 0) return [];
      const rows = await select('entity_uuid', 'request_path')
        .from('url_rewrite')
        .where('entity_type', '=', entityType)
        .and('entity_uuid', 'IN', [...uuids])
        .execute(pool);
      const m = new Map<string, string>(
        rows.map((r: any) => [r.entity_uuid, r.request_path])
      );
      return uuids.map((u) => m.get(u) ?? buildUrl(routeId, { uuid: u }));
    });
  registerLinkLoader('blog', 'post', blogLinkLoader('blog_post', 'blogPostView'));
  registerLinkLoader(
    'blog',
    'category',
    blogLinkLoader('blog_category', 'blogCategoryView')
  );
  registerLinkLoader('blog', 'tag', blogLinkLoader('blog_tag', 'blogTagView'));

  // Blog post collection filters
  addProcessor('blogPostCollectionFilters', registerDefaultBlogPostFilters, 1);
  addProcessor<Array<any>>(
    'blogPostCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Blog category collection filters
  addProcessor(
    'blogCategoryCollectionFilters',
    registerDefaultBlogCategoryFilters,
    1
  );
  addProcessor<Array<any>>(
    'blogCategoryCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Blog tag collection filters
  addProcessor('blogTagCollectionFilters', registerDefaultBlogTagFilters, 1);
  addProcessor<Array<any>>(
    'blogTagCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Blog comment collection filters (admin moderation grid)
  addProcessor(
    'blogCommentCollectionFilters',
    registerDefaultBlogCommentFilters,
    1
  );
  addProcessor<Array<any>>(
    'blogCommentCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Featured blogs widget
  registerWidget({
    type: 'featured_blogs',
    name: 'Featured blogs',
    description: 'A list of featured blog posts',
    category: 'content',
    icon: 'Newspaper',
    settingComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'blog/components/admin/FeaturedBlogsSetting.js'
    ),
    component: path.resolve(
      CONSTANTS.MODULESPATH,
      'blog/components/frontStore/FeaturedBlogs.js'
    ),
    previewComponent: path.resolve(
      CONSTANTS.MODULESPATH,
      'blog/components/admin/FeaturedBlogsPreview.js'
    ),
    enabled: true,
    defaultSettings: {
      eyebrow: '',
      heading: '',
      subText: '',
      postUuids: [],
      count: 3,
      columns: 3
    },
    schema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        eyebrow: { type: 'string' },
        heading: { type: 'string' },
        subText: { type: 'string' },
        postUuids: { type: 'array', items: { type: 'string' } },
        count: { type: 'integer', minimum: 1, maximum: 24 },
        columns: { type: 'integer', enum: [1, 2, 3, 4] }
      }
    },
    graphql: {
      typeDefs: `
        type FeaturedBlogsSettings {
          eyebrow: String
          heading: String
          subText: String
          postUuids: [String]
          count: Int
          columns: Int
        }
      `,
      settingsType: 'FeaturedBlogsSettings'
    }
  });
};
