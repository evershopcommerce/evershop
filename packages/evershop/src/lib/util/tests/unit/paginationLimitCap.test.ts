import { describe, it, expect } from '@jest/globals';
import { CONSTANTS } from '../../../helpers.js';
import { defaultPaginationFilters } from '../../defaultPaginationFilters.js';

/**
 * `?limit=` arrives on a PUBLIC query string — `/products`, every category
 * page, search. Uncapped, one request can ask a storefront to render the whole
 * catalog in a single response, dragging the description / inventory / image
 * joins and every per-item price and image resolver with it.
 *
 * Two entries participate. `limit` reports the value the storefront paginates
 * against; `*` runs last and is the one whose `query.limit()` actually survives,
 * because `SelectQuery.limit()` replaces rather than appends.
 */

type Filter = {
  key: string;
  operation: string[];
  callback: (...args: any[]) => void;
};
type Recorded = { offset: number; limit: number };

const filters = defaultPaginationFilters as unknown as Filter[];
const byKey = (key: string) => {
  const found = filters.find((f) => f.key === key);
  if (!found) {
    throw new Error(`no "${key}" pagination filter`);
  }
  return found;
};

function stubQuery() {
  const calls: Recorded[] = [];
  return {
    calls,
    limit: (offset: number, limit: number) => calls.push({ offset, limit }),
    orderDirection: () => undefined
  };
}

/** Run the pagination entries the way a collection does: in order, `*` last. */
function paginate(
  urlFilters: Array<{ key: string; value: string }>,
  ctx: { isAdmin?: boolean } = {}
) {
  const query = stubQuery();
  const currentFilters: Array<{ key: string; value: unknown }> = [];
  for (const filter of filters) {
    const match = urlFilters.find((f) => f.key === filter.key);
    if (filter.key === '*' || match) {
      filter.callback.apply(ctx, [query, 'eq', match?.value, currentFilters]);
    }
  }
  const reported = currentFilters.find((f) => f.key === 'limit');
  return {
    applied: query.calls[query.calls.length - 1],
    reported: reported ? parseInt(String(reported.value), 10) : undefined,
    limitEntries: currentFilters.filter((f) => f.key === 'limit').length
  };
}

const MAX = CONSTANTS.MAX_COLLECTION_SIZE;

describe('limit is capped', () => {
  it('has a ceiling that keeps the admin grid working', () => {
    // The grid offers 50 / 100 / 150 / 200, so anything below 200 would clip a
    // legitimate choice.
    expect(MAX).toBeGreaterThanOrEqual(200);
  });

  it('clamps an absurd request instead of honouring it', () => {
    const { applied } = paginate([{ key: 'limit', value: '100000' }]);
    expect(applied.limit).toBe(MAX);
  });

  it('reports the clamped value, not the requested one', () => {
    // The storefront computes ceil(total / limit); echoing 100000 back would
    // build links to pages that do not exist.
    const { reported } = paginate([{ key: 'limit', value: '100000' }]);
    expect(reported).toBe(MAX);
  });

  it('reports limit exactly once', () => {
    expect(paginate([{ key: 'limit', value: '50' }]).limitEntries).toBe(1);
  });

  it('leaves a reasonable request alone', () => {
    for (const value of ['1', '20', '50', '200']) {
      const { applied, reported } = paginate([{ key: 'limit', value }]);
      expect(applied.limit).toBe(parseInt(value, 10));
      expect(reported).toBe(parseInt(value, 10));
    }
  });

  it('keeps the offset consistent with the clamped size', () => {
    // Page 3 of 100000-per-page would otherwise seek to offset 200000.
    const { applied } = paginate([
      { key: 'page', value: '3' },
      { key: 'limit', value: '100000' }
    ]);
    expect(applied.limit).toBe(MAX);
    expect(applied.offset).toBe(2 * MAX);
  });

  it('caps even when no limit is supplied and the configured page size is absurd', () => {
    // The `*` entry is the real ceiling — it runs last and `limit()` replaces.
    const { applied } = paginate([{ key: 'limit', value: String(MAX * 10) }]);
    expect(applied.limit).toBeLessThanOrEqual(MAX);
  });

  it('still falls back to a default for a non-positive limit', () => {
    for (const value of ['0', '-5', 'abc']) {
      const { applied } = paginate([{ key: 'limit', value }]);
      expect(applied.limit).toBeGreaterThan(0);
      expect(applied.limit).toBeLessThanOrEqual(MAX);
    }
  });

  it('applies to the default page too, with nothing in the URL', () => {
    const { applied } = paginate([]);
    expect(applied.limit).toBeGreaterThan(0);
    expect(applied.limit).toBeLessThanOrEqual(MAX);
    expect(applied.offset).toBe(0);
  });
});
