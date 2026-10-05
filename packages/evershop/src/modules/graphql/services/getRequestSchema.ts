import type { GraphQLSchema } from 'graphql';
import { isDevelopmentMode } from '../../../lib/util/isDevelopmentMode.js';
import adminSchema, { rebuildSchema } from './buildSchema.js';
import storeFrontSchema, {
  rebuildStoreFrontSchema
} from './buildStoreFrontSchema.js';

/**
 * The schema a query runs against: the admin schema on an admin route, the
 * storefront schema everywhere else (the page builder's iframe included).
 *
 * Development rebuilds it every time, so an edit to a `.graphql` file shows up
 * without a restart. That is slow, so `getRequestSchema` keeps the answer for the
 * life of the request: the page-query middleware, which checks each widget's
 * variables, and the middleware that executes the query then share one rebuild
 * and, more to the point, one schema. A check against a schema other than the
 * one that executes would be worth nothing.
 */
const perRequest = new WeakMap<object, Promise<GraphQLSchema>>();

export function getSchemaFor(isAdmin: boolean): Promise<GraphQLSchema> {
  if (isDevelopmentMode()) {
    return isAdmin ? rebuildSchema() : rebuildStoreFrontSchema();
  }
  return Promise.resolve(isAdmin ? adminSchema : storeFrontSchema);
}

export function getRequestSchema(request: {
  currentRoute?: { isAdmin?: boolean };
}): Promise<GraphQLSchema> {
  let schema = perRequest.get(request);
  if (!schema) {
    schema = getSchemaFor(Boolean(request.currentRoute?.isAdmin));
    perRequest.set(request, schema);
  }
  return schema;
}
