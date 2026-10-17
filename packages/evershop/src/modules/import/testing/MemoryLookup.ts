import type {
  Lookup,
  StoredCategory,
  StoreFixture
} from '../services/ports/lookup.js';
import type { ImportEntity } from '../services/types.js';

/**
 * TEST-ONLY. A `Lookup` over a store described as data (`StoreFixture`). It
 * records what it was asked, so a test can check that the questions are batched.
 */
export class MemoryLookup implements Lookup {
  /** Every call of `categories`, with the keys it was given. */
  readonly categoryCalls: string[][] = [];

  /**
   * The categories of the store by `url_key`. `MemoryServices` writes here, so a
   * category it creates is found by the next question.
   */
  readonly stored = new Map<string, StoredCategory>();

  private readonly reserved: ReadonlySet<string>;

  private readonly definitions: Partial<
    Record<ImportEntity, ReadonlySet<string>>
  >;

  constructor(fixture: StoreFixture = {}) {
    (fixture.categories ?? []).forEach((category, index) => {
      this.stored.set(category.urlKey, {
        id: category.id ?? index + 1,
        uuid: category.uuid ?? `uuid-${category.urlKey}`,
        urlKey: category.urlKey,
        parentUrlKey: category.parentUrlKey ?? null,
        name: category.name ?? category.urlKey,
        status: category.status ?? 1
      });
    });
    this.reserved = new Set(fixture.reservedUrlKeys ?? []);
    this.definitions = Object.fromEntries(
      Object.entries(fixture.metafields ?? {}).map(([entity, keys]) => [
        entity,
        new Set(keys)
      ])
    );
  }

  async categories(
    urlKeys: readonly string[]
  ): Promise<Map<string, StoredCategory>> {
    this.categoryCalls.push([...urlKeys]);
    const found = new Map<string, StoredCategory>();
    for (const key of urlKeys) {
      const category = this.stored.get(key);
      if (category) {
        // A copy: the caller must not change the store by holding the answer.
        found.set(key, { ...category });
      }
    }
    return found;
  }

  async reservedUrlKeys(): Promise<ReadonlySet<string>> {
    return this.reserved;
  }

  async metafieldKeys(entity: ImportEntity): Promise<ReadonlySet<string>> {
    return this.definitions[entity] ?? new Set();
  }
}
