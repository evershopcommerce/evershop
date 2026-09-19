/**
 * Page-builder entity-scope registry.
 *
 * A route registered here gains per-entity page-builder editing: the editor
 * surfaces an entity selector (populated by `list`) and scopes widget placements
 * to `entity_urn` (built from `resolve`). Modules register their entity-scoped
 * routes from their own `bootstrap` — the page-builder never hardcodes or imports
 * a domain module. See wiki/landing-pages.md.
 *
 * This is a plain module-level registry (not the hook/processor registry), so it
 * is not subject to the post-bootstrap lock; by convention, registration happens
 * at bootstrap time only.
 */

export interface EntityScopeEntity {
  uuid: string;
  name: string;
  urlKey: string;
  urn: string;
  /**
   * Published flag, when the entity type has one. The editor's scope selector
   * badges `false` as a draft. Optional/nullable so entity types without a
   * publish concept simply omit it (no badge).
   */
  status?: boolean | null;
}

export interface EntityScopeConfig {
  /** The page-builder route id this scope applies to (e.g. `'landingPageView'`). */
  routeId: string;
  /** The entity type in URN vocabulary (e.g. `'landing_page'`). */
  entityType: string;
  /**
   * Resolve a single entity uuid → its `entity_urn` + the storefront preview path
   * the editor iframe should load. Returns null when the uuid doesn't resolve.
   */
  resolve: (
    uuid: string,
    pool: any
  ) => Promise<{ urn: string; previewPath: string } | null>;
  /** List all selectable entities for the editor's scope selector. */
  list: (pool: any) => Promise<EntityScopeEntity[]>;
}

const registry = new Map<string, EntityScopeConfig>();

export function registerEntityScope(config: EntityScopeConfig): void {
  registry.set(config.routeId, config);
}

export function getEntityScope(
  routeId: string | undefined | null
): EntityScopeConfig | undefined {
  return routeId ? registry.get(routeId) : undefined;
}

export function getAllEntityScopes(): EntityScopeConfig[] {
  return Array.from(registry.values());
}
