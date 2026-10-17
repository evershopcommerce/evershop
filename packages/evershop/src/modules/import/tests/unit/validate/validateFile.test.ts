import { describe, it, expect } from '@jest/globals';
import { Readable } from 'stream';
import {
  categoryFile,
  categoryRow,
  STORE_WITH_WOMEN
} from '../../../services/rules/categoryFiles.js';
import { validateFile } from '../../../services/validate/validateFile.js';
import { categoryValidator } from '../../../services/entities/category/categoryValidator.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { CHUNK_SIZES } from '../helpers/readAll.js';
import { validateCategories } from '../helpers/runValidation.js';

const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe('validateFile: two passes', () => {
  it('reads the file twice, so that no row is held', async () => {
    const result = await validateCategories(categoryFile(categoryRow()));
    expect(result.opened).toBe(2);
    expect(result.summary).toMatchObject({
      totalRows: 1,
      createRows: 1,
      updateRows: 0,
      errors: 0,
      warnings: 0,
      stopped: false,
      canceled: false
    });
  });

  it.each([
    ['a missing url_key column', 'name,status\nWomen,1\n'],
    ['a semicolon-separated file', 'url_key;name\nwomen;Women\n'],
    ['an unclosed quote', 'url_key,name\nwomen,"Women\n'],
    ['a file that is not text', Buffer.from([0xff, 0xfe, 0x00])]
  ])('reads it once and stops at %s', async (_name, file) => {
    const result = await validateCategories(file);
    expect(result.opened).toBe(1);
    expect(result.summary.stopped).toBe(true);
    expect(result.summary.createRows + result.summary.updateRows).toBe(0);
  });

  it('counts the rows that create and the rows that update, across batches', async () => {
    const keys = ['a', 'b', 'c', 'd', 'e'];
    const result = await validateCategories(
      categoryFile(
        ...keys.map((url_key) => categoryRow({ url_key, name: url_key }))
      ),
      {
        batchSize: 2,
        store: { categories: [{ urlKey: 'b' }, { urlKey: 'e' }] }
      }
    );
    expect(result.summary).toMatchObject({
      totalRows: 5,
      createRows: 3,
      updateRows: 2
    });
    expect(result.issues).toEqual([]);
  });

  it('asks the store once for each batch, and not again for a parent it already knows', async () => {
    const rows = [1, 2, 3].map((n) =>
      categoryRow({ url_key: `kid-${n}`, name: `Kid ${n}`, parent: 'women' })
    );
    const result = await validateCategories(categoryFile(...rows), {
      batchSize: 1,
      store: STORE_WITH_WOMEN
    });
    expect(result.issues).toEqual([]);
    expect(result.lookup.categoryCalls).toEqual([
      ['kid-1', 'women'],
      ['kid-2'],
      ['kid-3']
    ]);
  });

  it('takes 1,000 rows in a batch by default', async () => {
    const rows = Array.from({ length: 2500 }, (_, n) =>
      categoryRow({ url_key: `c-${n}`, name: `C ${n}` })
    );
    const result = await validateCategories(categoryFile(...rows));
    expect(result.summary).toMatchObject({ totalRows: 2500, createRows: 2500 });
    expect(result.lookup.categoryCalls.map((call) => call.length)).toEqual([
      1000, 1000, 500
    ]);
  });

  it('counts a key that appears twice once', async () => {
    const result = await validateCategories(
      categoryFile(
        categoryRow(),
        categoryRow({ name: 'again' }),
        categoryRow({ url_key: 'men' })
      )
    );
    expect(result.summary).toMatchObject({ totalRows: 3, createRows: 2 });
    expect(codes(result.issues)).toEqual(['DUPLICATE_KEY_IN_FILE']);
  });
});

describe('validateFile: what is reported', () => {
  it('gives every issue of a row, and the key of the row with each', async () => {
    const result = await validateCategories(
      categoryFile(
        categoryRow({
          url_key: 'cart',
          status: '7',
          position: '99999',
          image: 'ftp://x/a.png'
        })
      ),
      { store: { reservedUrlKeys: ['cart'] } }
    );
    expect(codes(result.issues).sort()).toEqual([
      'INVALID_VALUE',
      'INVALID_VALUE',
      'INVALID_VALUE',
      'URL_KEY_RESERVED'
    ]);
    expect(result.issues.map((issue) => issue.column).sort()).toEqual([
      'image',
      'position',
      'status',
      'url_key'
    ]);
    expect(result.keys).toEqual(['cart', 'cart', 'cart', 'cart']);
    expect(result.summary).toMatchObject({
      errors: 4,
      warnings: 0,
      byCode: { INVALID_VALUE: 3, URL_KEY_RESERVED: 1 }
    });
  });

  it('counts errors and warnings apart, and the template rows', async () => {
    const result = await validateCategories(
      'url_key,name,status,colour\nexample-category,x,1,red\nwomen,Women,9,red\n'
    );
    expect(result.summary).toMatchObject({
      totalRows: 2,
      exampleRows: 1,
      errors: 1,
      warnings: 2,
      byCode: { UNKNOWN_COLUMN: 1, TEMPLATE_EXAMPLE_ROW: 1, INVALID_VALUE: 1 }
    });
    // The example row does not count as a row that creates.
    expect(result.summary.createRows).toBe(1);
  });

  it('gives no key to an issue about the file or about a row that could not be read', async () => {
    const result = await validateCategories(
      'url_key,name,status\nwomen,Women\nmen,Men,1\n'
    );
    expect(result.issues.map((issue) => issue.code)).toEqual(['ROW_WIDTH']);
    expect(result.keys).toEqual([null]);
  });

  it('numbers the rows as a spreadsheet does, across blank lines', async () => {
    const result = await validateCategories(
      `${categoryFile(
        categoryRow(),
        '',
        ',,,,,,,,',
        categoryRow({ url_key: 'men', status: '7' })
      )}`
    );
    expect(result.issues).toMatchObject([
      { code: 'INVALID_VALUE', rowNumber: 5 }
    ]);
  });

  it('says the same about a file whatever way it is cut into chunks', async () => {
    const file = categoryFile(
      categoryRow(),
      categoryRow({ url_key: 'women', name: 'twice' }),
      categoryRow({ url_key: 'tops', parent: 'nowhere' }),
      categoryRow({ url_key: 'a', parent: 'b' }),
      categoryRow({ url_key: 'b', parent: 'a' }),
      categoryRow({ url_key: 'cart', status: 'x' }),
      '"Quoted, key",x'
    );
    const first = await validateCategories(file, {
      store: { reservedUrlKeys: ['cart'] },
      batchSize: 2
    });
    expect(first.issues.length).toBeGreaterThan(5);
    for (const chunkSize of CHUNK_SIZES.slice(1)) {
      const again = await validateCategories(file, {
        store: { reservedUrlKeys: ['cart'] },
        batchSize: 2,
        chunkSize
      });
      expect(JSON.stringify(again.issues)).toBe(JSON.stringify(first.issues));
      expect(again.summary).toEqual(first.summary);
    }
  });
});

describe('validateFile: the tree of categories', () => {
  it('follows a long chain in the store without a loop in the file', async () => {
    const store = {
      categories: Array.from({ length: 60 }, (_, n) => ({
        urlKey: `level-${n}`,
        parentUrlKey: n === 0 ? null : `level-${n - 1}`
      }))
    };
    const result = await validateCategories(
      categoryFile(
        categoryRow({ url_key: 'leaf', name: 'Leaf', parent: 'level-59' })
      ),
      { store }
    );
    expect(result.issues).toEqual([]);
  });

  it('does not loop forever on a loop in the store, and leaves it to the rows that are part of it', async () => {
    const store = {
      categories: [
        { urlKey: 'a', parentUrlKey: 'b' },
        { urlKey: 'b', parentUrlKey: 'a' }
      ]
    };
    const result = await validateCategories(
      categoryFile(categoryRow({ url_key: 'c', name: 'C', parent: 'a' })),
      { store }
    );
    expect(result.issues).toEqual([]);
    // A row that is part of the loop is told.
    const inside = await validateCategories(
      categoryFile(categoryRow({ url_key: 'a', name: 'A', parent: 'b' })),
      { store }
    );
    expect(codes(inside.issues)).toEqual(['PARENT_CYCLE']);
  });

  it('judges the tree as it will be after the import: a parent the file moves does not make a loop', async () => {
    // Stored: b is a child of a. The file moves b to the top (parent blank:
    // unchanged, so it stays) and gives a the parent c, which is new.
    const store = {
      categories: [{ urlKey: 'a' }, { urlKey: 'b', parentUrlKey: 'a' }]
    };
    const result = await validateCategories(
      categoryFile(
        categoryRow({ url_key: 'c', name: 'C' }),
        categoryRow({ url_key: 'a', name: 'A', parent: 'c' })
      ),
      { store }
    );
    expect(result.issues).toEqual([]);
    // The file gives b the parent a again, and a the parent b: that is a loop.
    const loop = await validateCategories(
      categoryFile(
        categoryRow({ url_key: 'a', name: 'A', parent: 'b' }),
        categoryRow({ url_key: 'b', name: 'B', parent: 'a' })
      ),
      { store }
    );
    expect(codes(loop.issues)).toEqual(['PARENT_CYCLE', 'PARENT_CYCLE']);
  });

  it('finds a loop that is long: nine steps from the category to itself', async () => {
    // x is the top. n1 is a child of x, n2 of n1, ... n8 of n7. The file gives x
    // the parent n8, which closes a loop of nine.
    const store = {
      categories: [
        { urlKey: 'x' },
        ...Array.from({ length: 8 }, (_, n) => ({
          urlKey: `n${n + 1}`,
          parentUrlKey: n === 0 ? 'x' : `n${n}`
        }))
      ]
    };
    const result = await validateCategories(
      categoryFile(categoryRow({ url_key: 'x', name: 'X', parent: 'n8' })),
      { store }
    );
    expect(codes(result.issues)).toEqual(['PARENT_CYCLE']);
    expect((result.issues[0].params.chain as string[]).length).toBe(10);
  });

  it('lets the file move a category away from the parent the store gave it: the file wins', async () => {
    // Stored: b is a child of a. The file puts a under b, and b under c. After
    // the import there is no loop, though the stored tree would make one.
    const store = {
      categories: [
        { urlKey: 'a' },
        { urlKey: 'b', parentUrlKey: 'a' },
        { urlKey: 'c' }
      ]
    };
    const result = await validateCategories(
      categoryFile(
        categoryRow({ url_key: 'a', name: 'A', parent: 'b' }),
        categoryRow({ url_key: 'b', name: 'B', parent: 'c' })
      ),
      { store }
    );
    expect(result.issues).toEqual([]);
  });

  it('puts the chain in the params of the cycle', async () => {
    const result = await validateCategories(
      categoryFile(
        categoryRow({ url_key: 'a', name: 'A', parent: 'b' }),
        categoryRow({ url_key: 'b', name: 'B', parent: 'a' })
      )
    );
    expect(result.issues[0].params).toEqual({ chain: ['a', 'b', 'a'] });
  });
});

describe('validateFile: stopping and failing', () => {
  it('stops when it is told to, before it has read anything', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await validateCategories(categoryFile(categoryRow()), {
      signal: controller.signal
    });
    expect(result.summary.canceled).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('stops when it is told to in the middle of a pass', async () => {
    const controller = new AbortController();
    const lookup = new MemoryLookup();
    const seen: string[] = [];
    const summary = await validateFile({
      validator: categoryValidator as never,
      context: {
        lookup,
        mode: 'upsert',
        now: () => 0,
        sha256Hex: () => '00000000'
      },
      open: () =>
        Readable.from([
          Buffer.from(
            categoryFile(
              categoryRow({ status: '9' }),
              categoryRow({ url_key: 'men', status: '9' })
            )
          )
        ]),
      onIssue: (issue) => {
        seen.push(issue.code);
        controller.abort();
      },
      signal: controller.signal
    });
    expect(summary.canceled).toBe(true);
    expect(seen).toEqual(['INVALID_VALUE']);
  });

  it('stops when it is told to in the second pass, between two batches', async () => {
    const controller = new AbortController();
    class AbortingLookup extends MemoryLookup {
      async categories(urlKeys: readonly string[]) {
        controller.abort();
        return super.categories(urlKeys);
      }
    }
    const summary = await validateFile({
      validator: categoryValidator as never,
      context: {
        lookup: new AbortingLookup(),
        mode: 'upsert',
        now: () => 0,
        sha256Hex: () => '00000000'
      },
      open: () =>
        Readable.from([
          Buffer.from(
            categoryFile(
              categoryRow({ url_key: 'a' }),
              categoryRow({ url_key: 'b' }),
              categoryRow({ url_key: 'c' })
            )
          )
        ]),
      onIssue: () => undefined,
      batchSize: 1,
      signal: controller.signal
    });
    expect(summary.canceled).toBe(true);
    // The first batch was judged; the others were not.
    expect(summary.createRows).toBe(1);
  });

  it('throws when the source fails: that is not a problem with the file', async () => {
    const failing = () =>
      new Readable({
        read() {
          this.destroy(new Error('connection lost'));
        }
      });
    await expect(
      validateFile({
        validator: categoryValidator as never,
        context: {
          lookup: new MemoryLookup(),
          mode: 'upsert',
          now: () => 0,
          sha256Hex: () => '00000000'
        },
        open: failing,
        onIssue: () => undefined
      })
    ).rejects.toThrow('connection lost');
  });

  it('waits for onIssue before it goes on', async () => {
    const order: string[] = [];
    await validateFile({
      validator: categoryValidator as never,
      context: {
        lookup: new MemoryLookup(),
        mode: 'upsert',
        now: () => 0,
        sha256Hex: () => '00000000'
      },
      open: () =>
        Readable.from([
          Buffer.from(
            categoryFile(
              categoryRow({ status: '9' }),
              categoryRow({ url_key: 'men', status: '8' })
            )
          )
        ]),
      onIssue: async (issue) => {
        order.push(`start ${issue.rowNumber}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(`end ${issue.rowNumber}`);
      }
    });
    expect(order).toEqual(['start 2', 'end 2', 'start 3', 'end 3']);
  });
});
