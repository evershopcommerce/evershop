import { describe, it, expect } from '@jest/globals';
import { ImageError } from '../../../services/images/types.js';
import {
  categoryFile,
  categoryRow,
  STORE_WITH_WOMEN
} from '../../../services/rules/categoryFiles.js';
import { importCategories, keyDeps } from '../helpers/runImport.js';

const named = (url_key: string, parent = '', more = {}) =>
  categoryRow({ url_key, name: url_key.toUpperCase(), parent, ...more });

const results = (run: { outcomes: { key: string; result: string }[] }) =>
  run.outcomes.map((outcome) => `${outcome.key}:${outcome.result}`);

const dbError = (code: string, message = 'database says no') =>
  Object.assign(new Error(message), { code });

describe('writeCategories: parents first (§ 4.3)', () => {
  it('writes the parent before the child, though the file lists the child first', async () => {
    const run = await importCategories(
      categoryFile(named('child', 'parent'), named('parent'))
    );
    expect(results(run)).toEqual(['parent:created', 'child:created']);
    expect(run.services.calls.map((call) => call.input.url_key)).toEqual([
      'parent',
      'child'
    ]);
    // The child is given the id of the parent that was just created.
    const parent = run.lookup.stored.get('parent');
    expect(run.services.calls[1].input.parent_id).toBe(String(parent?.id));
    expect(run.lookup.stored.get('child')?.parentUrlKey).toBe('parent');
  });

  it('writes level by level and, inside a level, in the order of the file', async () => {
    const run = await importCategories(
      categoryFile(
        named('leaf-1', 'mid-a'),
        named('top-b'),
        named('mid-a', 'top-a'),
        named('top-a'),
        named('leaf-2', 'mid-a')
      )
    );
    expect(run.outcomes.map((outcome) => outcome.key)).toEqual([
      'top-b',
      'top-a',
      'mid-a',
      'leaf-1',
      'leaf-2'
    ]);
    expect(run.outcomes.map((outcome) => outcome.unit)).toEqual([
      1, 2, 3, 4, 5
    ]);
    expect(run.outcomes.map((outcome) => outcome.rowNumber)).toEqual([
      3, 5, 4, 2, 6
    ]);
  });

  it('gives a parent that is in the store its stored id', async () => {
    const run = await importCategories(categoryFile(named('kid', 'women')), {
      store: STORE_WITH_WOMEN
    });
    expect(results(run)).toEqual(['kid:created']);
    expect(run.services.calls[0].input.parent_id).toBe('1');
  });

  it('writes a tree of a thousand rows with a few questions to the store', async () => {
    const rows = Array.from({ length: 1000 }, (_, n) =>
      named(`c${n}`, n < 10 ? '' : `c${n % 10}`)
    );
    const run = await importCategories(categoryFile(...rows));
    expect(run.outcomes.filter((o) => o.result === 'created')).toHaveLength(
      1000
    );
    // One question for level 0 and one for level 1, as the batch is 1,000 rows.
    expect(run.lookup.categoryCalls).toHaveLength(2);
  });

  it('asks the store again for each batch of rows', async () => {
    const run = await importCategories(
      categoryFile(named('a'), named('b'), named('c'), named('d'), named('e')),
      { batchSize: 2 }
    );
    expect(run.lookup.categoryCalls.map((call) => call.length)).toEqual([
      2, 2, 1
    ]);
  });
});

describe('writeCategories: what is sent to the services', () => {
  it('sends a new category everything the row said, typed, and the url_key', async () => {
    const run = await importCategories(
      categoryFile(
        categoryRow({
          url_key: 'shoes',
          name: 'Shoes',
          status: '0',
          position: '007',
          meta_title: 'Shoes',
          meta_description: 'Buy shoes',
          image: 'https://example.com/women.jpg'
        })
      )
    );
    const input = run.services.calls[0].input;
    expect(input).toMatchObject({
      url_key: 'shoes',
      name: 'Shoes',
      status: 0,
      position: '7',
      meta_title: 'Shoes',
      meta_description: 'Buy shoes',
      image: expect.stringMatching(
        /^\/assets\/catalog\/[0-9a-f]{2}\/[0-9a-f]{2}\/women\.png$/
      )
    });
    expect(input.description?.[0].columns[0].data.blocks[0]).toMatchObject({
      type: 'paragraph',
      data: { text: 'Clothes for women' }
    });
    expect('parent_id' in input).toBe(false);
  });

  it('sends an update only the cells that were given, and not the url_key', async () => {
    const run = await importCategories(
      categoryFile(
        categoryRow({
          name: '',
          status: '',
          position: '5',
          description: '',
          meta_title: '',
          meta_description: '',
          image: ''
        })
      ),
      { store: STORE_WITH_WOMEN }
    );
    expect(results(run)).toEqual(['women:updated']);
    expect(run.services.calls).toEqual([
      { method: 'updateCategory', uuid: 'uuid-women', input: { position: '5' } }
    ]);
  });

  it('does not send a parent that is the parent already: a change of parent moves the subtree', async () => {
    const store = {
      categories: [
        { urlKey: 'top' },
        { urlKey: 'other' },
        { urlKey: 'kid', parentUrlKey: 'top' }
      ]
    };
    const same = await importCategories(
      categoryFile(named('kid', 'top', { name: 'Kid' })),
      { store }
    );
    expect('parent_id' in same.services.calls[0].input).toBe(false);
    const moved = await importCategories(
      categoryFile(named('kid', 'other', { name: 'Kid' })),
      { store }
    );
    expect(moved.services.calls[0].input.parent_id).toBe('2');
    expect(moved.lookup.stored.get('kid')?.parentUrlKey).toBe('other');
  });

  it('leaves the parent alone when the cell is blank: v1 cannot move a category to the top', async () => {
    const run = await importCategories(
      categoryFile(named('kid', '', { name: 'Kid' })),
      {
        store: {
          categories: [
            { urlKey: 'top' },
            { urlKey: 'kid', parentUrlKey: 'top' }
          ]
        }
      }
    );
    expect('parent_id' in run.services.calls[0].input).toBe(false);
    expect(run.lookup.stored.get('kid')?.parentUrlKey).toBe('top');
  });

  it('does not call the service for an update that has nothing to update', async () => {
    const run = await importCategories(
      categoryFile(
        categoryRow({
          name: '',
          status: '',
          position: '',
          description: '',
          meta_title: '',
          meta_description: '',
          image: ''
        })
      ),
      { store: STORE_WITH_WOMEN }
    );
    expect(results(run)).toEqual(['women:updated']);
    expect(run.services.calls).toEqual([]);
  });

  it('fetches the image before the service is called (IMP-03)', async () => {
    const order: string[] = [];
    const run = await importCategories(
      categoryFile(named('a', '', { image: 'https://example.com/women.jpg' })),
      {
        prepare: ({ images, services }) => {
          const fetch = images.fetchAndStore.bind(images);
          images.fetchAndStore = async (url) => {
            order.push('image');
            return fetch(url);
          };
          services.failOn(() => {
            order.push('service');
            return false;
          }, new Error('never'));
        }
      }
    );
    expect(results(run)).toEqual(['a:created']);
    expect(order).toEqual(['image', 'service']);
  });
});

describe('writeCategories: the mode (ALL-16, IMP-07)', () => {
  it('refuses a category that exists in mode create, and calls nothing', async () => {
    const run = await importCategories(categoryFile(categoryRow()), {
      mode: 'create',
      store: STORE_WITH_WOMEN
    });
    expect(run.outcomes).toMatchObject([
      {
        result: 'failed',
        issues: [{ code: 'ALREADY_EXISTS', column: 'url_key' }]
      }
    ]);
    expect(run.services.calls).toEqual([]);
  });

  it('updates it when the job is a resumed one: the worker that died may have written it', async () => {
    const run = await importCategories(categoryFile(categoryRow()), {
      mode: 'create',
      store: STORE_WITH_WOMEN,
      resumed: true
    });
    expect(results(run)).toEqual(['women:updated']);
  });

  it('refuses a category that does not exist in mode update', async () => {
    const run = await importCategories(categoryFile(categoryRow()), {
      mode: 'update'
    });
    expect(run.outcomes).toMatchObject([
      { result: 'failed', issues: [{ code: 'NOT_FOUND', column: 'url_key' }] }
    ]);
    expect(run.services.calls).toEqual([]);
  });

  it('creates or updates in mode upsert', async () => {
    const run = await importCategories(
      categoryFile(categoryRow(), named('men')),
      { store: STORE_WITH_WOMEN }
    );
    expect(results(run)).toEqual(['women:updated', 'men:created']);
  });

  it('writes the same file twice without a duplicate: the second run updates', async () => {
    const file = categoryFile(named('b', 'a'), named('a'));
    const first = await importCategories(file);
    expect(results(first)).toEqual(['a:created', 'b:created']);
    const second = await importCategories(file, {
      store: { categories: [...first.lookup.stored.values()] }
    });
    expect(results(second)).toEqual(['a:updated', 'b:updated']);
    expect(
      second.services.calls.every((call) => call.method === 'updateCategory')
    ).toBe(true);
  });
});

describe('writeCategories: a row that fails (§ 8.6)', () => {
  it('reports it and goes on with the others (IMP-01)', async () => {
    const run = await importCategories(
      categoryFile(named('a'), named('b'), named('c')),
      {
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.input.url_key === 'b',
            new Error('disk full')
          )
      }
    );
    expect(results(run)).toEqual(['a:created', 'b:failed', 'c:created']);
    expect(run.outcomes[1].issues).toMatchObject([
      {
        code: 'WRITE_FAILED',
        severity: 'error',
        rowNumber: 3,
        message: expect.stringContaining('disk full')
      }
    ]);
  });

  it('gives the SQLSTATE of the database error', async () => {
    const run = await importCategories(categoryFile(named('a')), {
      prepare: ({ services }) =>
        services.failOn(() => true, dbError('23502', 'null value'))
    });
    expect(run.outcomes[0].issues[0]).toMatchObject({
      code: 'WRITE_FAILED',
      params: { sqlState: '23502' }
    });
  });

  it('skips the children of a failed row, and theirs (CAT-07)', async () => {
    const run = await importCategories(
      categoryFile(
        named('grandchild', 'child'),
        named('child', 'root'),
        named('root'),
        named('sibling', 'other'),
        named('other')
      ),
      {
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.input.url_key === 'root',
            new Error('boom')
          )
      }
    );
    expect(results(run)).toEqual([
      'root:failed',
      'other:created',
      'child:skipped',
      'sibling:created',
      'grandchild:skipped'
    ]);
    expect(run.outcomes.find((o) => o.key === 'child')?.issues).toMatchObject([
      {
        code: 'DEPENDENCY_FAILED',
        rowNumber: 3,
        column: 'parent',
        params: { parent: 'root' }
      }
    ]);
    expect(
      run.outcomes.find((o) => o.key === 'grandchild')?.issues[0].params
    ).toEqual({
      parent: 'child'
    });
    // Nothing was sent for the skipped rows.
    expect(run.services.calls.map((call) => call.input.url_key)).toEqual([
      'root',
      'other',
      'sibling'
    ]);
  });

  it('fails a row whose parent has gone from the store since the check', async () => {
    const run = await importCategories(categoryFile(named('kid', 'ghost')));
    expect(run.outcomes).toMatchObject([
      {
        result: 'failed',
        issues: [
          {
            code: 'REFERENCE_NOT_FOUND',
            column: 'parent',
            params: { value: 'ghost' }
          }
        ]
      }
    ]);
    expect(run.services.calls).toEqual([]);
  });

  it('reports a url_key that someone else took meanwhile as a conflict with its column (IMP-02)', async () => {
    const run = await importCategories(categoryFile(named('taken')), {
      prepare: ({ services, lookup }) =>
        services.failOn(() => {
          // Created by someone else between the question and the write.
          lookup.stored.set('taken', {
            id: 99,
            uuid: 'uuid-99',
            urlKey: 'taken',
            parentUrlKey: null,
            name: 'Taken',
            status: 1,
            metaData: {}
          });
          return false;
        }, new Error('never'))
    });
    expect(run.outcomes).toMatchObject([
      {
        result: 'failed',
        issues: [
          {
            code: 'CONFLICT',
            column: 'url_key',
            value: 'taken',
            params: { constraint: 'CATEGORY_URL_KEY_UNIQUE', sqlState: '23505' }
          }
        ]
      }
    ]);
    expect(run.outcomes[0].issues[0].message).toBe(
      'The url_key "taken" is already used by another category.'
    );
  });

  it('a create sends the set also when it is empty, and none when the store has no custom fields for categories', async () => {
    const withFields = await importCategories(categoryFile(named('a')), {
      store: {
        metafieldDefinitions: {
          category: [{ namespace: 'custom', key: 'note', type: 'short_text' }]
        }
      }
    });
    expect(withFields.services.calls[0].input.metafields).toEqual({});
    const without = await importCategories(categoryFile(named('a')));
    expect('metafields' in without.services.calls[0].input).toBe(false);
  });

  it('sends the custom fields, laid over the stored set, and refuses a value the store would refuse', async () => {
    const store = {
      categories: [
        {
          urlKey: 'men',
          name: 'Men',
          status: 1 as const,
          metaData: { custom: { banner_color: '#000000', note: 'kept' } }
        }
      ],
      metafieldDefinitions: {
        category: [
          { namespace: 'custom', key: 'banner_color', type: 'color' as const },
          { namespace: 'custom', key: 'note', type: 'short_text' as const }
        ]
      }
    };
    const run = await importCategories(
      'url_key,name,status,metafield:custom.banner_color\nwomen,Women,1,#1F2937\nmen,Men,1,#FFFFFF\nkids,Kids,1,red\n',
      { store }
    );
    expect(results(run)).toEqual([
      'women:created',
      'men:updated',
      'kids:failed'
    ]);
    expect(run.services.calls[0].input.metafields).toEqual({
      custom: { banner_color: '#1F2937' }
    });
    // an update keeps the other fields of the stored set
    expect(run.services.calls[1].input.metafields).toEqual({
      custom: { banner_color: '#FFFFFF', note: 'kept' }
    });
    expect(run.outcomes[2].issues[0]).toMatchObject({
      code: 'METAFIELD_INVALID',
      column: 'metafield:custom.banner_color'
    });
    expect(run.services.calls).toHaveLength(2);
  });
});

describe('writeCategories: transient failures are waited out (D-20, IMP-06)', () => {
  it('retries after 1 s and 3 s and succeeds', async () => {
    const run = await importCategories(categoryFile(named('a')), {
      prepare: ({ services }) =>
        services.failOn(
          () => true,
          () => dbError('40001', 'could not serialize'),
          2
        )
    });
    expect(results(run)).toEqual(['a:created']);
    expect(run.outcomes[0].retries).toBe(2);
    expect(run.clock.sleeps).toEqual([1000, 3000]);
    expect(run.services.calls).toHaveLength(3);
  });

  it('retries an update too', async () => {
    const run = await importCategories(
      categoryFile(categoryRow({ name: 'Women!' })),
      {
        store: STORE_WITH_WOMEN,
        prepare: ({ services }) =>
          services.failOn(
            () => true,
            () => dbError('40P01', 'deadlock detected'),
            1
          )
      }
    );
    expect(results(run)).toEqual(['women:updated']);
    expect(run.outcomes[0].retries).toBe(1);
    expect(run.clock.sleeps).toEqual([1000]);
    expect(run.services.calls.map((call) => call.method)).toEqual([
      'updateCategory',
      'updateCategory'
    ]);
  });

  it('gives up after the third retry, and counts the row once', async () => {
    const run = await importCategories(categoryFile(named('a')), {
      prepare: ({ services }) =>
        services.failOn(
          () => true,
          () => dbError('57014', 'canceling statement')
        )
    });
    expect(results(run)).toEqual(['a:failed']);
    expect(run.outcomes[0].retries).toBe(3);
    expect(run.clock.sleeps).toEqual([1000, 3000, 9000]);
    expect(run.services.calls).toHaveLength(4);
    expect(run.outcomes[0].issues[0].params).toEqual({ sqlState: '57014' });
  });

  it('does not retry a constraint or a bad value', async () => {
    const run = await importCategories(categoryFile(named('a')), {
      prepare: ({ services }) =>
        services.failOn(() => true, dbError('22001', 'too long'))
    });
    expect(results(run)).toEqual(['a:failed']);
    expect(run.clock.sleeps).toEqual([]);
    expect(run.services.calls).toHaveLength(1);
  });

  it('retries the image fetch too, and fails the row after the third retry', async () => {
    const url = 'https://example.com/slow.jpg';
    const run = await importCategories(
      categoryFile(named('a', '', { image: url })),
      {
        prepare: ({ images }) => images.fails(url, new ImageError('timeout'))
      }
    );
    expect(run.outcomes).toMatchObject([
      {
        result: 'failed',
        retries: 3,
        issues: [
          {
            code: 'IMAGE_UNREADABLE',
            column: 'image',
            params: { reason: 'timeout' }
          }
        ]
      }
    ]);
    expect(run.clock.sleeps).toEqual([1000, 3000, 9000]);
    expect(run.services.calls).toEqual([]);
  });

  it('does not retry an image that is not an image', async () => {
    const url = 'https://example.com/page.jpg';
    const run = await importCategories(
      categoryFile(named('a', '', { image: url })),
      {
        prepare: ({ images }) =>
          images.fails(
            url,
            new ImageError('not_an_image', { contentType: 'text/html' })
          )
      }
    );
    expect(run.outcomes[0]).toMatchObject({
      result: 'failed',
      retries: 0,
      issues: [{ code: 'IMAGE_UNREADABLE', params: { reason: 'not_an_image' } }]
    });
    expect(run.clock.sleeps).toEqual([]);
  });

  it('writes nothing for a row whose image cannot be read (IMP-03)', async () => {
    const url = 'https://example.com/missing.jpg';
    const run = await importCategories(
      categoryFile(named('a', '', { image: url }), named('b')),
      {
        prepare: ({ images }) =>
          images.fails(url, new ImageError('http_status', { status: 404 }))
      }
    );
    expect(results(run)).toEqual(['a:failed', 'b:created']);
    expect(run.lookup.stored.has('a')).toBe(false);
    expect(run.outcomes[0].issues[0].value).toBe(url);
  });
});

describe('writeCategories: choosing and stopping', () => {
  const file = categoryFile(
    named('a'),
    named('b', 'a'),
    named('c'),
    named('d', 'b')
  );

  it('writes only the units it is asked to, and numbers them as the whole plan does', async () => {
    const run = await importCategories(file, {
      include: ({ unit }) => unit >= 3
    });
    expect(run.outcomes.map((o) => [o.unit, o.key])).toEqual([
      [3, 'b'],
      [4, 'd']
    ]);
  });

  it('finds the parent of a unit that it passed over in the store: that is how a resume goes on', async () => {
    const first = await importCategories(file, {
      include: ({ key }) => key === 'a' || key === 'c'
    });
    expect(results(first)).toEqual(['a:created', 'c:created']);
    const second = await importCategories(file, {
      store: { categories: [...first.lookup.stored.values()] },
      resumed: true,
      include: ({ key }) => key === 'b' || key === 'd'
    });
    expect(results(second)).toEqual(['b:created', 'd:created']);
    expect(second.lookup.stored.get('d')?.parentUrlKey).toBe('b');
  });

  it('stops when it is told to, before the next unit', async () => {
    const controller = new AbortController();
    const run = await importCategories(file, {
      signal: controller.signal,
      prepare: ({ services }) =>
        services.failOn(() => {
          controller.abort();
          return false;
        }, new Error('never'))
    });
    expect(results(run)).toEqual(['a:created']);
  });

  it('does not ask the store about the next batch once it is told to stop', async () => {
    const controller = new AbortController();
    const run = await importCategories(
      categoryFile(named('a'), named('b'), named('c')),
      {
        batchSize: 1,
        signal: controller.signal,
        prepare: ({ services }) =>
          services.failOn(() => {
            controller.abort();
            return false;
          }, new Error('never'))
      }
    );
    expect(results(run)).toEqual(['a:created']);
    expect(run.lookup.categoryCalls).toHaveLength(1);
  });

  it('does not start the next level once it is told to stop', async () => {
    const controller = new AbortController();
    const run = await importCategories(
      categoryFile(named('a'), named('b', 'a')),
      {
        signal: controller.signal,
        prepare: ({ services }) =>
          services.failOn(() => {
            controller.abort();
            return false;
          }, new Error('never'))
      }
    );
    expect(results(run)).toEqual(['a:created']);
    expect(run.lookup.categoryCalls).toHaveLength(1);
  });

  it('stops when the consumer stops asking: no more rows are written', async () => {
    const run = await importCategories(file, { stopAfter: 2 });
    expect(results(run)).toEqual(['a:created', 'c:created']);
    expect(run.services.calls).toHaveLength(2);
  });

  it('is the same whatever way the file is cut and in a small batch', async () => {
    const a = await importCategories(file, { batchSize: 1 });
    const b = await importCategories(file);
    expect(results(a)).toEqual(results(b));
    expect(a.services.calls.map((c) => c.input.url_key)).toEqual(
      b.services.calls.map((c) => c.input.url_key)
    );
  });
});

describe('writeCategories: the whole way, with the test store', () => {
  it('leaves the store with the tree the file described', async () => {
    const run = await importCategories(
      categoryFile(
        named('t-shirts', 'apparel'),
        named('apparel'),
        named('hoodies', 'apparel'),
        named('bags', 'accessories'),
        named('accessories'),
        named('archive', '', { status: '0' })
      )
    );
    expect(run.outcomes.every((o) => o.result === 'created')).toBe(true);
    const tree = Object.fromEntries(
      [...run.lookup.stored.values()].map((c) => [c.urlKey, c.parentUrlKey])
    );
    expect(tree).toEqual({
      apparel: null,
      accessories: null,
      archive: null,
      hoodies: 'apparel',
      't-shirts': 'apparel',
      bags: 'accessories'
    });
    expect(run.lookup.stored.get('archive')?.status).toBe(0);
    expect(keyDeps.sha256Hex('x')).toHaveLength(64);
  });
});
