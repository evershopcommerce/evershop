import type {
  CategoryWrite,
  EntityServices
} from '../services/ports/services.js';
import type { MemoryLookup } from './MemoryLookup.js';

/** The error PostgreSQL gives for a unique constraint. */
function uniqueViolation(constraint: string, value: string): Error {
  return Object.assign(
    new Error(
      `duplicate key value violates unique constraint "${constraint}": ${value}`
    ),
    { code: '23505', constraint }
  );
}

/**
 * TEST-ONLY. The category services over the same store that `MemoryLookup`
 * answers from, so a category that is created is found by the next question. It
 * keeps the rules that matter to the writer: a unique `url_key`, a parent that
 * must exist, a name and a `url_key` to create, and the id and uuid of a category.
 */
export class MemoryServices implements EntityServices {
  /** What each category has been given, merged over its updates, by uuid. */
  readonly written = new Map<string, CategoryWrite>();

  constructor(private readonly store: MemoryLookup) {}

  private byId(id: string) {
    return [...this.store.stored.values()].find(
      (category) => String(category.id) === id
    );
  }

  async createCategory(
    input: CategoryWrite
  ): Promise<{ id: number; uuid: string }> {
    if (!input.name) throw new Error('Category name is required');
    if (!input.url_key) throw new Error('URL key is required');
    if (this.store.stored.has(input.url_key)) {
      throw uniqueViolation('CATEGORY_URL_KEY_UNIQUE', input.url_key);
    }
    let parentUrlKey: string | null = null;
    if (input.parent_id !== undefined) {
      const parent = this.byId(input.parent_id);
      if (!parent) throw new Error('Parent category not found');
      parentUrlKey = parent.urlKey;
    }
    const id =
      Math.max(0, ...[...this.store.stored.values()].map((c) => c.id)) + 1;
    const uuid = `uuid-${id}`;
    this.store.stored.set(input.url_key, {
      id,
      uuid,
      urlKey: input.url_key,
      parentUrlKey,
      name: input.name,
      status: input.status ?? 1
    });
    this.written.set(uuid, { ...input });
    return { id, uuid };
  }

  async updateCategory(uuid: string, input: CategoryWrite): Promise<void> {
    const category = [...this.store.stored.values()].find(
      (candidate) => candidate.uuid === uuid
    );
    if (!category) throw new Error('Category not found');
    if (input.parent_id !== undefined) {
      const parent = this.byId(input.parent_id);
      if (!parent) throw new Error('Parent category not found');
      category.parentUrlKey = parent.urlKey;
    }
    if (input.name !== undefined) category.name = input.name;
    if (input.status !== undefined) category.status = input.status;
    this.written.set(uuid, { ...this.written.get(uuid), ...input });
  }
}
