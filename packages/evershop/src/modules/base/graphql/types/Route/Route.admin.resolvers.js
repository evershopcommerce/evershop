import { getRoutes } from '../../../../../lib/router/Router.js';

/**
 * Per-route sample-entity resolvers for the page-builder preview iframe.
 * Each entry replaces a `:param` segment in the route's `path` with a
 * concrete value from the database so the iframe can render something
 * meaningful instead of 404'ing on `/category/:uuid`.
 *
 * Adding a new dynamic editable route: register its sampler here. Keeping
 * the table central (rather than spreading per-module Route extensions)
 * makes the supported set obvious at a glance.
 */
const PREVIEW_SAMPLERS = {
  categoryView: {
    param: 'uuid',
    sql: 'SELECT uuid FROM category ORDER BY category_id LIMIT 1'
  },
  productView: {
    param: 'uuid',
    sql: 'SELECT uuid FROM product ORDER BY product_id LIMIT 1'
  },
  cmsPageView: {
    param: 'url_key',
    sql: `SELECT cps.url_key
            FROM cms_page p
            INNER JOIN cms_page_description cps
              ON cps.cms_page_description_cms_page_id = p.cms_page_id
            WHERE p.status = true
            ORDER BY p.cms_page_id LIMIT 1`
  },
  blogPostView: {
    param: 'uuid',
    sql: 'SELECT uuid FROM blog_post WHERE status = 1 ORDER BY blog_post_id LIMIT 1'
  },
  blogCategoryView: {
    param: 'uuid',
    sql: 'SELECT uuid FROM blog_category WHERE status = 1 ORDER BY blog_category_id LIMIT 1'
  },
  blogTagView: {
    param: 'uuid',
    sql: 'SELECT uuid FROM blog_tag ORDER BY blog_tag_id LIMIT 1'
  }
};

async function resolvePreviewPath(route, pool) {
  if (!route?.path) return null;
  if (!route.path.includes(':')) return route.path;
  const sampler = PREVIEW_SAMPLERS[route.id];
  if (!sampler || !pool) return route.path;
  try {
    const result = await pool.query(sampler.sql);
    const value = result.rows[0]?.[sampler.param];
    if (value) return route.path.replace(`:${sampler.param}`, value);
  } catch {
    // DB lookup failed — fall through to the unresolved path. The iframe
    // will render whatever the route does for an invalid param, but the
    // editor shell still works for layer / settings / publish actions.
  }
  return route.path;
}

export default {
  Query: {
    routes: () => {
      const routes = getRoutes();
      return routes.filter((route) => route.name);
    },
    route: (_, { id }) => {
      const routes = getRoutes();
      return routes.find((route) => route.id === id) || null;
    }
  },
  Route: {
    methods: (route) => route?.method ?? [],
    // Default to false so programmatically-registered routes (which skip
    // `parseRoute` and never see the `route.json` `editable` field) still
    // satisfy the non-nullable schema field.
    editableInPageBuilder: (route) => route?.editable === true,
    previewPath: (route, _, { pool }) => resolvePreviewPath(route, pool),
    // Populated by per-module resolvers (e.g. cms) for routes whose
    // URL pattern resolves to a single entity. Default null.
    assignedEntity: () => null
  }
};
