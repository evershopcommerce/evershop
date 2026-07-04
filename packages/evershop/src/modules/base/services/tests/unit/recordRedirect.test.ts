import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Record the executed query-builder operations in order, with their args, so we
// can assert the reclaim -> collapse -> upsert sequence without a real DB.
interface Op {
  kind: string;
  table: string;
  keys?: string[];
  where?: unknown[];
  given?: unknown;
}
let ops: Op[] = [];

const makeChain = (op: Op) => {
  const chain: any = {
    where: jest.fn((c: unknown, o: unknown, v: unknown) => {
      op.where = [c, o, v];
      return chain;
    }),
    and: jest.fn(() => chain),
    given: jest.fn((d: unknown) => {
      op.given = d;
      return chain;
    }),
    execute: jest.fn(async () => {
      ops.push(op);
    })
  };
  return chain;
};

const del = jest.fn((table: string) => makeChain({ kind: 'del', table }));
const update = jest.fn((table: string) => makeChain({ kind: 'update', table }));
const insertOnUpdate = jest.fn((table: string, keys: string[]) =>
  makeChain({ kind: 'insertOnUpdate', table, keys })
);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  del,
  update,
  insertOnUpdate
}));

const {
  recordRedirect,
  recordRedirectsBatch,
  clearRedirectsForEntity,
  clearRedirectsForEntities
} = await import('../../recordRedirect.js');

const conn = {} as any;

describe('recordRedirect', () => {
  beforeEach(() => {
    ops = [];
    jest.clearAllMocks();
  });

  it('reclaims the destination, collapses incoming chains, then upserts — in that order', async () => {
    await recordRedirect(conn, {
      fromPath: '/old',
      toPath: '/new',
      entityUrn: 'urn:evershop:cms:page:abc'
    });

    expect(ops).toEqual([
      // 1. reclaim: delete any redirect sitting on the now-live destination
      { kind: 'del', table: 'url_redirect', where: ['from_path', '=', '/new'] },
      // 2. collapse: repoint anything that pointed at the vacated /old -> /new
      {
        kind: 'update',
        table: 'url_redirect',
        given: { to_path: '/new' },
        where: ['to_path', '=', '/old']
      },
      // 3. upsert the new hop, keyed on from_path
      {
        kind: 'insertOnUpdate',
        table: 'url_redirect',
        keys: ['from_path'],
        given: {
          from_path: '/old',
          to_path: '/new',
          entity_urn: 'urn:evershop:cms:page:abc',
          source: 'auto'
        }
      }
    ]);
  });

  it('is a no-op when from == to (self-redirect guard)', async () => {
    await recordRedirect(conn, { fromPath: '/same', toPath: '/same' });
    expect(ops).toEqual([]);
  });

  it('is a no-op on an empty from/to path', async () => {
    await recordRedirect(conn, { fromPath: '', toPath: '/new' });
    await recordRedirect(conn, { fromPath: '/old', toPath: '' });
    expect(ops).toEqual([]);
  });

  it('defaults entity_urn to null when omitted (manual redirect)', async () => {
    await recordRedirect(conn, { fromPath: '/a', toPath: '/b' });
    const upsert = ops.find((o) => o.kind === 'insertOnUpdate');
    expect((upsert?.given as any).entity_urn).toBeNull();
  });
});

describe('recordRedirectsBatch', () => {
  // The batch writer uses raw connection.query (not the query builder), so mock
  // that and assert the reclaim -> collapse -> upsert statements + their array
  // params, in order.
  const makeConn = () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const c = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        return { rows: [] };
      })
    };
    return { c: c as any, calls };
  };

  it('emits reclaim, collapse, upsert in order with the right array params', async () => {
    const { c, calls } = makeConn();
    await recordRedirectsBatch(c, [
      { fromPath: '/old-a', toPath: '/new-a', entityUrn: 'urn:a' },
      { fromPath: '/old-b', toPath: '/new-b', entityUrn: 'urn:b' }
    ]);

    expect(calls).toHaveLength(3);
    // 1. reclaim: delete rows sitting on the now-live destinations (the tos)
    expect(calls[0].sql).toMatch(/DELETE FROM url_redirect/i);
    expect(calls[0].params).toEqual([['/new-a', '/new-b']]);
    // 2. collapse: repoint incoming chains, mapping froms -> tos
    expect(calls[1].sql).toMatch(/UPDATE url_redirect/i);
    expect(calls[1].params).toEqual([
      ['/old-a', '/old-b'],
      ['/new-a', '/new-b']
    ]);
    // 3. upsert: the new hops, with froms, tos, urns
    expect(calls[2].sql).toMatch(/INSERT INTO url_redirect/i);
    expect(calls[2].params).toEqual([
      ['/old-a', '/old-b'],
      ['/new-a', '/new-b'],
      ['urn:a', 'urn:b']
    ]);
  });

  it('drops self-redirects and empty paths, defaulting a missing urn to null', async () => {
    const { c, calls } = makeConn();
    await recordRedirectsBatch(c, [
      { fromPath: '/same', toPath: '/same' }, // self — dropped
      { fromPath: '', toPath: '/x' }, // empty — dropped
      { fromPath: '/keep', toPath: '/kept' } // no urn -> null
    ]);
    expect(calls[2].params).toEqual([['/keep'], ['/kept'], [null]]);
  });

  it('de-duplicates on fromPath (last write wins, matching ON CONFLICT)', async () => {
    const { c, calls } = makeConn();
    await recordRedirectsBatch(c, [
      { fromPath: '/p', toPath: '/first', entityUrn: 'urn:1' },
      { fromPath: '/p', toPath: '/second', entityUrn: 'urn:2' }
    ]);
    expect(calls[2].params).toEqual([['/p'], ['/second'], ['urn:2']]);
  });

  it('issues no queries at all when every spec is a no-op', async () => {
    const { c, calls } = makeConn();
    await recordRedirectsBatch(c, [{ fromPath: '/a', toPath: '/a' }]);
    expect(calls).toHaveLength(0);
  });
});

describe('clearRedirectsForEntity', () => {
  beforeEach(() => {
    ops = [];
    jest.clearAllMocks();
  });

  it('purges by entity_urn (the whole historical alias chain), NOT by current path', async () => {
    await clearRedirectsForEntity(conn, 'urn:evershop:catalog:product:xyz');
    expect(ops).toEqual([
      {
        kind: 'del',
        table: 'url_redirect',
        where: ['entity_urn', '=', 'urn:evershop:catalog:product:xyz']
      }
    ]);
  });
});

describe('clearRedirectsForEntities', () => {
  it('purges every URN in one DELETE ... = ANY(...) (subtree cleanup)', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const c = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        return { rows: [] };
      })
    } as any;
    const urns = [
      'urn:evershop:catalog:category:a',
      'urn:evershop:catalog:category:b'
    ];
    await clearRedirectsForEntities(c, urns);
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/DELETE FROM url_redirect.*entity_urn = ANY/is);
    expect(calls[0].params).toEqual([urns]);
  });

  it('issues no query for an empty URN list', async () => {
    const c = { query: jest.fn() } as any;
    await clearRedirectsForEntities(c, []);
    expect(c.query).not.toHaveBeenCalled();
  });
});
