import { describe, expect, it } from '@jest/globals';
import resolvers from '../../Widget.resolvers.js';

const basicMenuWidget = (resolvers as any).Query.basicMenuWidget as (
  parent: unknown,
  args: { settings: unknown },
  context: { linkLoaders: Record<string, unknown> }
) => Promise<{ menus: any[] }>;

const item = (overrides: Record<string, unknown>) => ({
  name: 'Item',
  type: 'custom',
  url: '/x',
  children: [],
  ...overrides
});

describe('basicMenuWidget ids', () => {
  it('keeps the node ids the settings UI minted, at both levels', async () => {
    const { menus } = await basicMenuWidget(
      null,
      {
        settings: {
          menus: [
            item({
              id: 'mpcah3a4',
              uuid: 'cat-1',
              children: [item({ id: 'mpcahb53', uuid: 'cat-1' })]
            }),
            item({ id: 'mpcagyhi', uuid: 'cat-1' })
          ]
        }
      },
      { linkLoaders: {} }
    );
    expect(menus.map((m) => m.id)).toEqual(['mpcah3a4', 'mpcagyhi']);
    expect(menus[0].children[0].id).toBe('mpcahb53');
    // Two items linking the same category no longer share a key.
    expect(new Set(menus.map((m) => m.id)).size).toBe(2);
  });

  it('synthesizes an id only for legacy items that have none', async () => {
    const { menus } = await basicMenuWidget(
      null,
      {
        settings: {
          menus: [item({ uuid: 'cat-1', children: [item({ uuid: 'cat-1' })] }), item({ uuid: 'cat-2' })]
        }
      },
      { linkLoaders: {} }
    );
    const ids = [menus[0].id, menus[0].children[0].id, menus[1].id];
    for (const id of ids) expect(typeof id).toBe('string');
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(3);
  });

  it('still accepts the legacy stringified list setting', async () => {
    const { menus } = await basicMenuWidget(
      null,
      { settings: { menus: JSON.stringify([item({ id: 'a1' })]) } },
      { linkLoaders: {} }
    );
    expect(menus).toHaveLength(1);
    expect(menus[0].id).toBe('a1');
  });
});
