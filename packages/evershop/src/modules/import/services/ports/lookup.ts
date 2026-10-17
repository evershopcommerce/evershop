import type { ImportEntity } from '../types.js';

/** A category as the store has it now (the merged state for an update). */
export interface StoredCategory {
  id: number;
  urlKey: string;
  /** The `url_key` of its parent, or null at the top level. */
  parentUrlKey: string | null;
  name: string;
  status: 0 | 1;
}

/**
 * Read-only, batched questions about the store (§ 4.5, point 2). The stages ask
 * through this port and never touch the database. The real one is `PgLookup`,
 * the test double is `MemoryLookup`. This is the part the categories need; the
 * other entities add their questions.
 */
export interface Lookup {
  /**
   * The stored categories for these `url_key`s. A key that is not stored is
   * missing from the map.
   */
  categories(urlKeys: readonly string[]): Promise<Map<string, StoredCategory>>;
  /**
   * The single-segment storefront routes and the enabled locale codes that a
   * `url_key` must not equal (CAT-08, PRD-22).
   */
  reservedUrlKeys(): Promise<ReadonlySet<string>>;
  /** The `namespace.key` of every custom-field definition of an entity (ALL-08). */
  metafieldKeys(entity: ImportEntity): Promise<ReadonlySet<string>>;
}

/**
 * The store described as plain data. `MemoryLookup` is built from it, and a rule
 * example (§ 4.5, point 3) carries one, so an example needs no test double.
 */
export interface StoreFixture {
  categories?: Array<
    Partial<Omit<StoredCategory, 'urlKey'>> & { urlKey: string }
  >;
  reservedUrlKeys?: string[];
  metafields?: Partial<Record<ImportEntity, string[]>>;
}
