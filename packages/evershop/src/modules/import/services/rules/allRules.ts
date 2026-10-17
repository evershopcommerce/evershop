import { Buffer } from 'buffer';
import {
  categoryFile,
  categoryRow,
  STORE_WITH_WOMEN
} from './categoryFiles.js';
import { defineRule } from './rule.js';

/**
 * The rules of every entity (§ 7.4, `ALL`), shown on category files. The rules
 * of the file and the reader (ALL-01 to ALL-06, ALL-12, ALL-19, ALL-23) are
 * enforced by the reader; they are here so that the catalogue is complete and
 * each is proven on a file.
 *
 * Most examples use an update of an existing category (`STORE_WITH_WOMEN`), so
 * that a rule about the file is not mixed with the rule that a new category
 * needs a status.
 */
const VALID = categoryFile(categoryRow());
const UPDATE = { mode: 'update' as const, store: STORE_WITH_WOMEN };

export const ALL_01 = defineRule({
  id: 'ALL-01',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'FILE_ENCODING',
  testedBy: 'example',
  summary:
    'The file is UTF-8 text; a BOM is accepted and stripped. Invalid UTF-8 is refused.',
  examples: {
    pass: [
      {
        name: 'a byte order mark in front',
        file: Buffer.concat([
          Buffer.from([0xef, 0xbb, 0xbf]),
          Buffer.from(VALID)
        ]),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a Latin-1 "é" in the middle of the text',
        file: Buffer.concat([
          Buffer.from('url_key,name\nwomen,Caf'),
          Buffer.from([0xe9]),
          Buffer.from('\n')
        ]),
        expect: [{ code: 'FILE_ENCODING' }]
      },
      {
        name: 'a UTF-16 file (Excel "Unicode Text")',
        file: Buffer.from([0xff, 0xfe, 0x75, 0x00, 0x72, 0x00]),
        expect: [{ code: 'FILE_ENCODING' }]
      }
    ]
  }
});

export const ALL_02 = defineRule({
  id: 'ALL-02',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'FILE_EMPTY',
  testedBy: 'example',
  summary: 'The file has a header row and at least one data row.',
  examples: {
    pass: [{ name: 'a header and a row', file: VALID, expect: [] }],
    fail: [
      { name: 'nothing at all', file: '', expect: [{ code: 'FILE_EMPTY' }] },
      {
        name: 'a header and nothing else',
        file: `${categoryFile().trim()}\n`,
        expect: [{ code: 'FILE_EMPTY' }]
      },
      {
        name: 'a header and rows of empty cells',
        file: categoryFile(',,,,,,,,', ',,,,,,,,'),
        expect: [{ code: 'FILE_EMPTY' }]
      }
    ]
  }
});

export const ALL_03 = defineRule({
  id: 'ALL-03',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'FILE_TOO_LARGE',
  testedBy: 'example',
  summary: 'The number of data rows is within the configured cap.',
  examples: {
    pass: [
      {
        name: 'exactly the cap',
        limits: { maxRows: 1 },
        ...UPDATE,
        file: VALID,
        expect: []
      }
    ],
    fail: [
      {
        name: 'one row over the cap',
        limits: { maxRows: 1 },
        ...UPDATE,
        file: categoryFile(categoryRow(), categoryRow({ url_key: 'men' })),
        expect: [{ code: 'FILE_TOO_LARGE' }]
      }
    ]
  }
});

export const ALL_04 = defineRule({
  id: 'ALL-04',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'WRONG_DELIMITER',
  testedBy: 'example',
  summary:
    'The file is comma-separated. A header that is a single cell but contains ";" or a tab is refused with a hint.',
  examples: {
    pass: [{ name: 'commas', ...UPDATE, file: VALID, expect: [] }],
    fail: [
      {
        name: 'semicolons (Excel in many locales)',
        file: 'url_key;name;status\nwomen;Women;1\n',
        expect: [{ code: 'WRONG_DELIMITER' }]
      },
      {
        name: 'tabs',
        file: 'url_key\tname\twomen\tWomen\n',
        expect: [{ code: 'WRONG_DELIMITER' }]
      }
    ]
  }
});

export const ALL_05 = defineRule({
  id: 'ALL-05',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'DUPLICATE_COLUMN',
  testedBy: 'example',
  summary: 'No column name appears twice.',
  examples: {
    pass: [{ name: 'each name once', ...UPDATE, file: VALID, expect: [] }],
    fail: [
      {
        name: 'name twice',
        ...UPDATE,
        file: 'url_key,name,name\nwomen,Women,Women\n',
        expect: [{ code: 'DUPLICATE_COLUMN', column: 'name' }]
      }
    ]
  }
});

export const ALL_06 = defineRule({
  id: 'ALL-06',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'ROW_WIDTH',
  testedBy: 'example',
  summary: 'Every row has as many cells as the header.',
  examples: {
    pass: [{ name: 'the same width', ...UPDATE, file: VALID, expect: [] }],
    fail: [
      {
        name: 'one cell too many',
        ...UPDATE,
        file: `${categoryFile(categoryRow())}women,Women,,1,0,x,x,x,x,extra\n`,
        expect: [{ code: 'ROW_WIDTH', rowNumber: 3 }]
      },
      {
        name: 'one cell too few',
        ...UPDATE,
        file: 'url_key,name,status\nwomen,Women\n',
        expect: [{ code: 'ROW_WIDTH', rowNumber: 2 }]
      }
    ]
  }
});

export const ALL_07 = defineRule({
  id: 'ALL-07',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'MISSING_COLUMN',
  testedBy: 'example',
  summary: 'The header contains the natural-key column.',
  examples: {
    pass: [{ name: 'url_key is there', ...UPDATE, file: VALID, expect: [] }],
    fail: [
      {
        name: 'no url_key',
        file: 'name,status\nWomen,1\n',
        expect: [{ code: 'MISSING_COLUMN', column: 'url_key' }]
      }
    ]
  }
});

export const ALL_08 = defineRule({
  id: 'ALL-08',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'REFERENCE_NOT_FOUND',
  testedBy: 'example',
  summary:
    'A column "metafield:<namespace>.<key>" names a definition that exists (the engine never creates one, D-6).',
  examples: {
    pass: [
      {
        name: 'the definition exists',
        ...UPDATE,
        store: {
          ...STORE_WITH_WOMEN,
          metafields: { category: ['custom.banner'] }
        },
        file: 'url_key,name,metafield:custom.banner\nwomen,Women,wide\n',
        expect: []
      }
    ],
    fail: [
      {
        name: 'no such definition',
        ...UPDATE,
        file: 'url_key,name,metafield:custom.banner\nwomen,Women,wide\n',
        expect: [
          { code: 'REFERENCE_NOT_FOUND', column: 'metafield:custom.banner' }
        ]
      },
      {
        name: 'a definition of another entity',
        ...UPDATE,
        store: {
          ...STORE_WITH_WOMEN,
          metafields: { product: ['custom.banner'] }
        },
        file: 'url_key,name,metafield:custom.banner\nwomen,Women,wide\n',
        expect: [
          { code: 'REFERENCE_NOT_FOUND', column: 'metafield:custom.banner' }
        ]
      }
    ]
  }
});

export const ALL_09 = defineRule({
  id: 'ALL-09',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'UNKNOWN_COLUMN',
  testedBy: 'example',
  summary: 'Any other unknown column is a warning and is ignored.',
  examples: {
    pass: [
      { name: 'only known columns', ...UPDATE, file: VALID, expect: [] },
      {
        name: 'a column with no name and nothing in it (a spreadsheet adds them)',
        ...UPDATE,
        file: 'url_key,name,\nwomen,Women,\n',
        expect: []
      }
    ],
    fail: [
      {
        name: 'a column that is not in the template',
        ...UPDATE,
        file: 'url_key,name,colour\nwomen,Women,red\n',
        expect: [{ code: 'UNKNOWN_COLUMN', column: 'colour' }]
      },
      {
        name: 'a product column in a category file',
        ...UPDATE,
        file: 'url_key,attr:color\nwomen,red\n',
        expect: [{ code: 'UNKNOWN_COLUMN', column: 'attr:color' }]
      },
      {
        name: 'a column with no name that holds something (said once)',
        ...UPDATE,
        file: 'url_key,name,\nwomen,Women,stray\nwomen,Women,again\n',
        expect: [
          { code: 'UNKNOWN_COLUMN', rowNumber: 2 },
          { code: 'DUPLICATE_KEY_IN_FILE', rowNumber: 3, column: 'url_key' }
        ]
      }
    ]
  }
});

export const ALL_10 = defineRule({
  id: 'ALL-10',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'Booleans are 1, 0, true, false in any letter case; they are converted to 1 and 0.',
  examples: {
    pass: [
      {
        name: 'TRUE, False and 1',
        file: categoryFile(
          categoryRow({ status: 'TRUE' }),
          categoryRow({ url_key: 'men', status: 'False' }),
          categoryRow({ url_key: 'kids', status: '1' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'yes',
        file: categoryFile(categoryRow({ status: 'yes' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'status' }]
      }
    ]
  }
});

export const ALL_12 = defineRule({
  id: 'ALL-12',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'A cell is not longer than the cap and contains no NUL character, which PostgreSQL text cannot store.',
  examples: {
    pass: [
      {
        name: 'a cell of exactly the cap',
        limits: { maxCellLength: 5 },
        ...UPDATE,
        file: 'url_key,name\nwomen,Women\n',
        expect: []
      }
    ],
    fail: [
      {
        name: 'a cell one character over the cap',
        limits: { maxCellLength: 5 },
        ...UPDATE,
        file: 'url_key,name\nwomen,Womens\n',
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'name' }]
      },
      {
        name: 'a NUL character',
        ...UPDATE,
        file: 'url_key,name\nwomen,Wo\u0000men\n',
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'name' }]
      }
    ]
  }
});

export const ALL_13 = defineRule({
  id: 'ALL-13',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'The natural key is present in every row. A blank url_key gets the key derived from the name first; with no name either the row is refused.',
  examples: {
    pass: [
      {
        name: 'a blank url_key and a name',
        file: categoryFile(categoryRow({ url_key: '', name: 'Men' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'no url_key and no name',
        file: categoryFile(categoryRow({ url_key: '', name: '' })),
        expect: [{ code: 'MISSING_REQUIRED', rowNumber: 2, column: 'url_key' }]
      }
    ]
  }
});

export const ALL_14 = defineRule({
  id: 'ALL-14',
  entity: 'all',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'DUPLICATE_KEY_IN_FILE',
  testedBy: 'example',
  summary:
    'The natural key appears once; every repeat after the first is an error.',
  examples: {
    pass: [
      {
        name: 'two different keys',
        file: categoryFile(categoryRow(), categoryRow({ url_key: 'men' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the same key twice',
        file: categoryFile(categoryRow(), categoryRow({ name: 'Women again' })),
        expect: [
          { code: 'DUPLICATE_KEY_IN_FILE', rowNumber: 3, column: 'url_key' }
        ]
      },
      {
        name: 'the same key twice, with a blank row between',
        file: categoryFile(categoryRow(), '', categoryRow()),
        expect: [
          { code: 'DUPLICATE_KEY_IN_FILE', rowNumber: 4, column: 'url_key' }
        ]
      }
    ]
  }
});

export const ALL_16 = defineRule({
  id: 'ALL-16',
  entity: 'all',
  layer: 'M',
  source: 'engine',
  op: 'B',
  code: 'ALREADY_EXISTS',
  alsoCodes: ['NOT_FOUND'],
  testedBy: 'example',
  summary:
    'Mode create: the key must not exist. Mode update: the key must exist.',
  examples: {
    pass: [
      {
        name: 'create, and it is new',
        mode: 'create',
        file: VALID,
        expect: []
      },
      {
        name: 'update, and it exists',
        mode: 'update',
        store: STORE_WITH_WOMEN,
        file: VALID,
        expect: []
      },
      {
        name: 'upsert creates or updates',
        mode: 'upsert',
        store: STORE_WITH_WOMEN,
        file: VALID,
        expect: []
      }
    ],
    fail: [
      {
        name: 'create, and it exists',
        mode: 'create',
        store: STORE_WITH_WOMEN,
        file: VALID,
        expect: [{ code: 'ALREADY_EXISTS', rowNumber: 2, column: 'url_key' }]
      },
      {
        name: 'update, and it does not exist',
        mode: 'update',
        file: VALID,
        expect: [{ code: 'NOT_FOUND', rowNumber: 2, column: 'url_key' }]
      }
    ]
  }
});

export const ALL_18 = defineRule({
  id: 'ALL-18',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'TEMPLATE_EXAMPLE_ROW',
  testedBy: 'example',
  summary:
    "A row whose natural key is one of the template's reserved example keys is skipped with a warning.",
  examples: {
    pass: [{ name: 'a real key', file: VALID, expect: [] }],
    fail: [
      {
        name: 'the example category of the template',
        file: categoryFile(
          categoryRow({ url_key: 'example-category', name: '', status: '' })
        ),
        expect: [
          { code: 'TEMPLATE_EXAMPLE_ROW', rowNumber: 2, column: 'url_key' }
        ]
      }
    ]
  }
});

export const ALL_19 = defineRule({
  id: 'ALL-19',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'UNKNOWN_COLUMN',
  testedBy: 'example',
  summary:
    'A column named _errors is reserved and ignored, with no unknown-column warning.',
  examples: {
    pass: [
      {
        name: 'the column of the file with errors',
        file: categoryFile(categoryRow())
          .replace('\n', ',_errors\n')
          .replace(/\n$/, ',"column x: an old problem"\n'),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a column that only looks like it',
        ...UPDATE,
        file: 'url_key,_error\nwomen,x\n',
        expect: [{ code: 'UNKNOWN_COLUMN', column: '_error' }]
      }
    ]
  }
});

export const ALL_20 = defineRule({
  id: 'ALL-20',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'A value fits its database column (position: 0 to 32,767).',
  examples: {
    pass: [
      {
        name: 'the largest position',
        file: categoryFile(categoryRow({ position: '32767' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'one over',
        file: categoryFile(categoryRow({ position: '32768' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'position' }]
      }
    ]
  }
});

export const ALL_22 = defineRule({
  id: 'ALL-22',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'runner',
  test: 'tests/unit/cells/restParity.test.ts and text.test.ts',
  summary:
    'Text cells are escaped as the REST layer escapes them; the exempt columns are description, metafield: columns, password and password_hash.'
});

export const ALL_23 = defineRule({
  id: 'ALL-23',
  entity: 'all',
  layer: 'F',
  source: 'engine',
  op: 'B',
  code: 'UNCLOSED_QUOTE',
  alsoCodes: ['ROW_TOO_LARGE'],
  testedBy: 'example',
  summary:
    'Every quote that is opened is closed before the end of the file, and a row is at most 1 MiB.',
  examples: {
    pass: [
      {
        name: 'a quoted cell with a comma and a quote',
        ...UPDATE,
        file: 'url_key,name\nwomen,"Women, ""big"" sale"\n',
        expect: []
      }
    ],
    fail: [
      {
        name: 'a quote that is never closed',
        ...UPDATE,
        file: 'url_key,name\nwomen,"Women\nmen,Men\n',
        expect: [{ code: 'UNCLOSED_QUOTE' }]
      },
      {
        name: 'a row over the size limit',
        ...UPDATE,
        limits: { maxRowBytes: 20 },
        file: 'url_key,name\nwomen,Women and a very long name\n',
        expect: [{ code: 'ROW_TOO_LARGE' }]
      }
    ]
  }
});

export const ALL_RULES = [
  ALL_01,
  ALL_02,
  ALL_03,
  ALL_04,
  ALL_05,
  ALL_06,
  ALL_07,
  ALL_08,
  ALL_09,
  ALL_10,
  ALL_12,
  ALL_13,
  ALL_14,
  ALL_16,
  ALL_18,
  ALL_19,
  ALL_20,
  ALL_22,
  ALL_23
];
