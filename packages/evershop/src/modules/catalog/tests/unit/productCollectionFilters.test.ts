import { describe, it, expect } from '@jest/globals';
import registerDefaultProductCollectionFilters from '../../services/registerDefaultProductCollectionFilters.js';

/**
 * The `cat` filter callback, exercised against a stub query AND a stub pool.
 * The subtree lookup is injected through the callback's `this` context, which
 * is what `ProductCollection.init` passes — so this still needs no database. No DB: what matters here is the SQL these emit and what they push to
 * `currentFilters`, both of which are pure functions of the input.
 *
 * `cat` matches the whole SUBTREE. A product carries exactly one category
 * (`product_category` was dropped in migration Version-1.0.2) and normally sits
 * on a leaf, so an exact match against a branch returns nothing — which also
 * made the category page contradict itself, since its listing is subtree-aware
 * while the facet was not.
 */

type RawCall = { link: string; sql: string; binding: Record<string, unknown> };
type AndWhereCall = [string, string, unknown];

function stubQuery() {
  const raws: RawCall[] = [];
  const andWheres: AndWhereCall[] = [];
  return {
    raws,
    andWheres,
    getWhere: () => ({
      addRaw: (link: string, sql: string, binding: Record<string, unknown>) => {
        raws.push({ link, sql, binding });
      }
    }),
    andWhere: (field: string, operator: string, value: unknown) => {
      andWheres.push([field, operator, value]);
    }
  };
}

type Filter = {
  key: string;
  operation: string[];
  callback: (...args: any[]) => void | Promise<void>;
};

async function getFilter(key: string): Promise<Filter> {
  const filters = (await registerDefaultProductCollectionFilters.call({
    filterableAttributes: [],
    isAdmin: false
  })) as Filter[];
  const filter = filters.find((f) => f.key === key);
  if (!filter) {
    throw new Error(`No "${key}" filter registered`);
  }
  return filter;
}

/** Returns each seed id plus a `+1000` descendant, so expansion is visible. */
function stubPool(rows?: number[]) {
  const calls: unknown[][] = [];
  return {
    calls,
    query: async (_text: string, values: unknown[]) => {
      calls.push(values);
      const seeds = (values[0] as number[]) ?? [];
      const out = rows ?? seeds.flatMap((id) => [id, id + 1000]);
      return { rows: out.map((category_id) => ({ category_id })), rowCount: out.length };
    }
  };
}

async function applyFilter(
  key: string,
  operation: string,
  value: string,
  pool = stubPool()
) {
  const filter = await getFilter(key);
  const query = stubQuery();
  const currentFilters: Array<{
    key: string;
    operation: string;
    value: unknown;
  }> = [];
  await filter.callback.apply({ isAdmin: false, pool }, [
    query,
    operation,
    value,
    currentFilters
  ]);
  return { query, currentFilters, filter, pool };
}

const oneLine = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('cat filter', () => {
  it('accepts the operations the URL parser can produce', async () => {
    const filter = await getFilter('cat');
    // buildFilterFromUrl emits `eq` for ?cat=5 and `in` for ?cat=5&cat=9.
    expect(filter.operation).toEqual(expect.arrayContaining(['eq', 'in', 'nin']));
  });

  it('expands the subtree first, then passes ONE array parameter', async () => {
    const { query, pool } = await applyFilter('cat', 'eq', '5');

    // The subtree lookup happens in Node, seeded with the selected ids.
    expect(pool.calls).toEqual([[[5]]]);

    expect(query.raws).toHaveLength(1);
    expect(query.andWheres).toHaveLength(0);
    const { sql, binding, link } = query.raws[0];
    expect(link).toBe('AND');

    // NOT a recursive CTE in the predicate. Inlining one hides the category-set
    // cardinality from the planner, which then drops PRODUCT_CATEGORY_ID_INDEX
    // and seq-scans `product` — 32x slower on a narrow category at 300k rows.
    expect(oneLine(sql)).not.toContain('WITH RECURSIVE');

    // One binding holding the whole expanded array, not one per id: that is
    // what keeps the parameter count flat and the plan index-driven.
    const keys = Object.keys(binding);
    expect(keys).toHaveLength(1);
    expect(oneLine(sql)).toBe(`product.category_id = ANY(:${keys[0]}::int[])`);
    expect(binding[keys[0]]).toEqual([5, 1005]);
  });

  it('parses a comma list and drops anything that is not a positive integer', async () => {
    const { pool } = await applyFilter('cat', 'in', '5,9,abc,-3,0,12');
    expect(pool.calls).toEqual([[[5, 9, 12]]]);
  });

  it('negates with <> ALL for nin', async () => {
    // Same three-valued logic as the previous NOT IN — a NULL category_id is
    // excluded either way — but it takes the array parameter.
    const { query } = await applyFilter('cat', 'nin', '5');
    expect(oneLine(query.raws[0].sql)).toContain('category_id <> ALL(');
  });

  it('uses = ANY for eq and in', async () => {
    for (const op of ['eq', 'in']) {
      const { query } = await applyFilter('cat', op, '5');
      expect(oneLine(query.raws[0].sql)).toContain('category_id = ANY(');
      expect(oneLine(query.raws[0].sql)).not.toContain('ALL(');
    }
  });

  it('reports the ORIGINAL ids, never the expansion', async () => {
    // DefaultCategoryFilterRender reads this value for isCategorySelected() and
    // getSelectedCount(); an expanded list would tick every descendant's box and
    // inflate the "N selected" badge.
    const { currentFilters } = await applyFilter('cat', 'in', '5,9');
    expect(currentFilters).toEqual([
      { key: 'cat', operation: 'in', value: '5,9' }
    ]);
  });

  it('is a no-op when nothing usable was selected, without hitting the DB', async () => {
    for (const value of ['', 'abc', '0', '-1', ',,']) {
      const { query, currentFilters, pool } = await applyFilter(
        'cat',
        'eq',
        value
      );
      expect(query.raws).toHaveLength(0);
      expect(query.andWheres).toHaveLength(0);
      expect(currentFilters).toHaveLength(0);
      expect(pool.calls).toHaveLength(0);
    }
  });

  it('is a no-op when the selected categories no longer exist', async () => {
    const { query, currentFilters } = await applyFilter(
      'cat',
      'eq',
      '999',
      stubPool([])
    );
    expect(query.raws).toHaveLength(0);
    expect(currentFilters).toHaveLength(0);
  });

  it('uses a fresh binding key per call so two cat filters cannot collide', async () => {
    const a = await applyFilter('cat', 'eq', '5');
    const b = await applyFilter('cat', 'eq', '9');
    expect(Object.keys(a.query.raws[0].binding)[0]).not.toEqual(
      Object.keys(b.query.raws[0].binding)[0]
    );
  });
});
