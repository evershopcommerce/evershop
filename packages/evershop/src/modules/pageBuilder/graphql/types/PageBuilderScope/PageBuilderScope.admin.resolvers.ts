import { pool } from '../../../../../lib/postgres/connection.js';
import { getEntityScope } from '../../../../../lib/util/entityScopeRegistry.js';

export default {
  Query: {
    // Generic entity list for the scope selector: look up the given route's
    // registered scope and return its entities (empty when the route has none).
    // `routeId` is an ARGUMENT, not read from context — this is a client-side
    // query (a separate GraphQL POST) whose request never ran the pageBuilderEdit
    // page handler, so `context.pageBuilderRouteId` would be undefined there.
    pageBuilderScopeEntities: async (
      _: unknown,
      { routeId }: { routeId: string }
    ) => {
      const scope = getEntityScope(routeId);
      return scope ? scope.list(pool) : [];
    },
    // The GraphQL context is `{ ...getContext(request), linkLoaders }`
    // (graphqlMiddleware.js), so every `setContextValue(request, key, …)` the
    // pageBuilderEdit handler set is readable straight off `context`. Both
    // values are null outside an entity-scoped editor session (route-level
    // scope, or any storefront request that never sets them).
    pageBuilderScope: (
      _: unknown,
      __: unknown,
      context: Record<string, unknown>
    ) => ({
      entityUrn: (context.pageBuilderEntityUrn as string | null) ?? null,
      previewPath: (context.pageBuilderPreviewPath as string | null) ?? null
    })
  }
};
