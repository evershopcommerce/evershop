import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * `featured_blogs` returned nothing without `postUuids`, post uuids belong to the store, and a theme
 * cannot name them, so a freshly activated storefront had no way to show its journal (theme-lab
 * FINDINGS #52). With no picks it now shows the newest published posts.
 *
 * The REAL query builder runs here against a fake connection, so the SQL text is asserted, not
 * assumed: the builder keeps ONE order-by field and a second `orderBy` call silently replaces the
 * first, which a mocked builder would never show.
 */
const queries: Array<{ text: string; values: unknown[] }> = [];
let rows: Array<Record<string, unknown>> = [];
const fakePool = {
  query: jest.fn(async (q: { text: string; values: unknown[] }) => {
    queries.push(q);
    return { rows };
  }),
  // The builder hands a connection back after a query.
  release: () => undefined
};
jest.unstable_mockModule('../../../../../../../lib/postgres/connection.js', () => ({ pool: fakePool }));
const { default: resolvers } = await import('../../FeaturedBlogsWidget.resolvers.js');

const post = (n: number, extra: Record<string, unknown> = {}) => ({
  blog_post_id: n,
  uuid: `uuid-${n}`,
  name: `Post ${n}`,
  url_key: `post-${n}`,
  short_description: `Summary ${n}`,
  published_at: `2026-09-0${n}T00:00:00.000Z`,
  ...extra
});
const run = (args: Record<string, unknown>) => {
  const parent = (resolvers as any).Query.featuredBlogsWidget(null, args);
  return (resolvers as any).FeaturedBlogsWidget.posts(parent) as Promise<Array<Record<string, unknown>>>;
};

beforeEach(() => {
  queries.length = 0;
  rows = [];
});

describe('featured blogs with no posts picked', () => {
  it('shows the newest published posts, newest first', async () => {
    rows = [post(3), post(2), post(1)];
    const out = await run({ postUuids: [], count: 3 });
    expect(queries).toHaveLength(1);
    const { text } = queries[0];
    expect(text).toContain('FROM "blog_post"');
    expect(text).toMatch(/WHERE \(\s*"blog_post"\."status" = /);
    expect(text).toContain('ORDER BY "blog_post"."published_at" DESC');
    expect(text).toMatch(/LIMIT 3 OFFSET 0/);
    expect(out.map((p) => p.uuid)).toEqual(['uuid-3', 'uuid-2', 'uuid-1']);
  });

  it('asks for published posts only', async () => {
    await run({ postUuids: [], count: 3 });
    expect(queries[0].values).toEqual([1]);
  });

  it('returns the posts in the shape the component reads (camelCase)', async () => {
    rows = [post(1)];
    const [first] = await run({ postUuids: [] });
    expect(first).toMatchObject({ uuid: 'uuid-1', name: 'Post 1', urlKey: 'post-1', shortDescription: 'Summary 1' });
  });

  it('honours the count', async () => {
    await run({ postUuids: [], count: 5 });
    expect(queries[0].text).toMatch(/LIMIT 5 OFFSET 0/);
  });

  it.each([null, undefined, 0, -2])('falls back to three when the count is %s', async (count) => {
    await run({ postUuids: [], count });
    expect(queries[0].text).toMatch(/LIMIT 3 OFFSET 0/);
  });

  it('treats a missing postUuids setting as no picks', async () => {
    await run({});
    expect(queries).toHaveLength(1);
    expect(queries[0].text).toContain('ORDER BY "blog_post"."published_at" DESC');
  });

  it('ignores entries that are not uuids, so they do not count as picks', async () => {
    await run({ postUuids: [null, 42, {}] });
    expect(queries[0].text).toContain('ORDER BY "blog_post"."published_at" DESC');
  });

  it('shows nothing, not an error, on a blog with no published posts', async () => {
    rows = [];
    expect(await run({ postUuids: [], count: 3 })).toEqual([]);
  });
});

describe('featured blogs with posts picked', () => {
  it('still resolves the picks, in pick order, and does not fall back', async () => {
    rows = [post(1), post(2), post(3)];
    const out = await run({ postUuids: ['uuid-3', 'uuid-1'], count: 5 });
    expect(queries).toHaveLength(1);
    expect(queries[0].text).toContain('"blog_post"."uuid" IN');
    expect(queries[0].text).not.toContain('ORDER BY');
    expect(out.map((p) => p.uuid)).toEqual(['uuid-3', 'uuid-1']);
  });

  it('caps the picks at the count, as before', async () => {
    rows = [post(1), post(2), post(3)];
    const out = await run({ postUuids: ['uuid-1', 'uuid-2', 'uuid-3'], count: 2 });
    expect(out.map((p) => p.uuid)).toEqual(['uuid-1', 'uuid-2']);
  });

  it('shows nothing when every pick has been unpublished or deleted: a choice, not an absence of one', async () => {
    rows = [];
    expect(await run({ postUuids: ['gone-1', 'gone-2'], count: 3 })).toEqual([]);
    expect(queries).toHaveLength(1);
  });
});
