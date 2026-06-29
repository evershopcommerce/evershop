import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import { CONSTANTS } from '../../lib/helpers.js';
import { buildUrl } from '../../lib/router/buildUrl.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { addProcessor } from '../../lib/util/registry.js';
import {
  linkLoaderFromBatch,
  registerLinkLoader
} from '../../lib/widget/linkResolver.js';
import { registerWidget } from '../../lib/widget/widgetManager.js';
import { registerDefaultBlogCategoryFilters } from './services/registerDefaultBlogCategoryFilters.js';
import { registerDefaultBlogCommentFilters } from './services/registerDefaultBlogCommentFilters.js';
import { registerDefaultBlogPostFilters } from './services/registerDefaultBlogPostFilters.js';
import { registerDefaultBlogTagFilters } from './services/registerDefaultBlogTagFilters.js';

export default (): void => {
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
