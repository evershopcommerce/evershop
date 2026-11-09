import { describe, expect, it } from '@jest/globals';
import {
  STATUS_FILTERS,
  clearedUrl,
  countOf,
  filteredUrl,
  readFilters
} from '../../../ui/gridUrl.js';

const BASE = 'https://shop.test/admin/import';

describe('what the filters of the list say', () => {
  it('reads the three controls from what the list applied', () => {
    expect(
      readFilters([
        { key: 'status', operation: 'eq', value: 'completed' },
        { key: 'entity', operation: 'eq', value: 'product' },
        { key: 'file', operation: 'like', value: 'spring' },
        { key: 'page', operation: 'eq', value: '2' }
      ])
    ).toEqual({ status: 'completed', entity: 'product', file: 'spring' });
  });

  it('has nothing when nothing was applied', () => {
    expect(readFilters([])).toEqual({ status: '', entity: '', file: '' });
  });
});

describe('the address of the list with a filter changed', () => {
  it('sets the status', () => {
    expect(filteredUrl(BASE, { status: 'stopped' })).toBe(
      `${BASE}?status=stopped`
    );
  });

  it('sets the type', () => {
    expect(filteredUrl(BASE, { entity: 'customerAddress' })).toBe(
      `${BASE}?entity=customerAddress`
    );
  });

  it('sets the file name as a "like" filter, trimmed', () => {
    const url = new URL(filteredUrl(BASE, { file: '  spring sale ' }));
    expect(url.searchParams.get('file[operation]')).toBe('like');
    expect(url.searchParams.get('file[value]')).toBe('spring sale');
  });

  it('removes a filter when its value is empty', () => {
    const start = filteredUrl(
      filteredUrl(filteredUrl(BASE, { status: 'stopped' }), {
        entity: 'product'
      }),
      { file: 'a' }
    );
    const url = new URL(
      filteredUrl(start, { status: '', entity: '', file: '   ' })
    );
    expect([...url.searchParams.keys()]).toEqual([]);
  });

  it('keeps the other filters and the order', () => {
    const start = `${BASE}?status=stopped&ob=created_at&od=desc&limit=50`;
    const url = new URL(filteredUrl(start, { entity: 'product' }));
    expect(url.searchParams.get('status')).toBe('stopped');
    expect(url.searchParams.get('entity')).toBe('product');
    expect(url.searchParams.get('ob')).toBe('created_at');
    expect(url.searchParams.get('od')).toBe('desc');
    expect(url.searchParams.get('limit')).toBe('50');
  });

  it('goes back to the first page, because the list is a different one now', () => {
    const url = new URL(
      filteredUrl(`${BASE}?page=4&status=stopped`, { status: 'failed' })
    );
    expect(url.searchParams.has('page')).toBe(false);
    expect(url.searchParams.get('status')).toBe('failed');
  });

  it('leaves a filter alone when the change does not name it', () => {
    const url = new URL(
      filteredUrl(`${BASE}?status=stopped`, { entity: 'product' })
    );
    expect(url.searchParams.get('status')).toBe('stopped');
  });

  it('keeps characters that mean something in a file name out of the other parameters', () => {
    const url = new URL(filteredUrl(BASE, { file: 'a&b=c#d' }));
    expect(url.searchParams.get('file[value]')).toBe('a&b=c#d');
    expect([...url.searchParams.keys()]).toEqual([
      'file[operation]',
      'file[value]'
    ]);
  });
});

describe('the address of the list with nothing set', () => {
  it('drops every filter, the order and the page', () => {
    expect(clearedUrl(`${BASE}?status=stopped&ob=status&od=asc&page=3`)).toBe(
      BASE
    );
  });
});

describe('the numbers of a job', () => {
  it('reads a count', () => {
    expect(countOf({ total: 10, created: 7 }, 'created')).toBe(7);
    expect(countOf({ failed: 0 }, 'failed')).toBe(0);
  });

  it('gives null for a count that was not made yet', () => {
    expect(countOf({}, 'total')).toBeNull();
    expect(countOf(null, 'total')).toBeNull();
    expect(countOf(undefined, 'total')).toBeNull();
  });

  it('gives null for something that is not a number', () => {
    expect(countOf({ total: '10' }, 'total')).toBeNull();
    expect(countOf({ total: Number.NaN }, 'total')).toBeNull();
    expect(countOf({ total: Infinity }, 'total')).toBeNull();
  });
});

describe('the statuses that can be filtered by', () => {
  it('are every status the list can show, and not the upload that has not arrived', () => {
    expect([...STATUS_FILTERS].sort()).toEqual([
      'canceled',
      'completed',
      'failed',
      'interrupted',
      'queued',
      'running',
      'stopped',
      'uploaded',
      'validated',
      'validating'
    ]);
  });
});
