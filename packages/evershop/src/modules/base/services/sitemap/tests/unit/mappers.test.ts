import {
  mapEntityRows,
  mapStaticPaths
} from '../../collectors/mappers.js';

describe('mapEntityRows', () => {
  it('maps request_path to canonical path and updated_at to ISO lastmod', () => {
    const out = mapEntityRows(
      [{ request_path: '/women/shoes/awesome', updated_at: '2026-01-01T10:00:00.000Z' }],
      { changefreq: 'daily', priority: 0.7 }
    );
    expect(out).toEqual([
      {
        path: '/women/shoes/awesome',
        lastmod: '2026-01-01T10:00:00.000Z',
        changefreq: 'daily',
        priority: 0.7
      }
    ]);
  });

  it('accepts a Date updated_at', () => {
    const out = mapEntityRows([
      { request_path: '/x', updated_at: new Date('2026-03-04T05:06:07.000Z') }
    ]);
    expect(out[0].lastmod).toBe('2026-03-04T05:06:07.000Z');
  });

  it('omits lastmod for null / invalid updated_at', () => {
    expect(
      mapEntityRows([{ request_path: '/x', updated_at: null }])[0].lastmod
    ).toBeUndefined();
    expect(
      mapEntityRows([{ request_path: '/y', updated_at: 'not-a-date' }])[0].lastmod
    ).toBeUndefined();
  });

  it('skips rows without a request_path', () => {
    const out = mapEntityRows([
      { request_path: '', updated_at: null },
      { request_path: '/ok', updated_at: null }
    ]);
    expect(out).toEqual([{ path: '/ok' }]);
  });

  it('returns [] for no rows', () => {
    expect(mapEntityRows([])).toEqual([]);
  });

  it('does not inject changefreq / priority when not configured', () => {
    expect(mapEntityRows([{ request_path: '/x', updated_at: null }])[0]).toEqual({
      path: '/x'
    });
  });
});

describe('mapStaticPaths', () => {
  it('maps configured static paths', () => {
    expect(
      mapStaticPaths([{ path: '/', priority: 1, changefreq: 'daily' }])
    ).toEqual([{ path: '/', priority: 1, changefreq: 'daily' }]);
  });

  it('skips non-root-relative paths', () => {
    expect(
      mapStaticPaths([{ path: 'https://x.com' }, { path: 'foo' }, { path: '/ok' }])
    ).toEqual([{ path: '/ok' }]);
  });
});
