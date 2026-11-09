import {
  categoryFile,
  categoryRow,
  STORE_WITH_WOMEN
} from './categoryFiles.js';
import { defineRule } from './rule.js';

/**
 * The rules of the category file (§ 7.4, `CAT`) and the image rule it shares
 * with products (`IMG-01`). Each is shown on a valid file with one cell changed.
 *
 * Not here yet: CAT-07 (a child of a failed parent is skipped) is a rule of the
 * import phase and is proven by a runner test when the runner exists.
 */
const A_PARENT = (urlKey: string, parent: string) =>
  categoryRow({ url_key: urlKey, name: urlKey, parent });

export const CAT_01 = defineRule({
  id: 'CAT-01',
  entity: 'category',
  layer: 'S',
  source: 'core+engine',
  op: 'C',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'Create requires name and url_key (core; a blank url_key is derived first, CAT-09) and status (engine: the column is NOT NULL with no default).',
  examples: {
    pass: [
      {
        name: 'an update needs nothing but the key',
        store: STORE_WITH_WOMEN,
        file: categoryFile(
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
        expect: []
      }
    ],
    fail: [
      {
        name: 'a new category without a name',
        file: categoryFile(categoryRow({ name: '' })),
        expect: [{ code: 'MISSING_REQUIRED', rowNumber: 2, column: 'name' }]
      },
      {
        name: 'a new category without a status',
        file: categoryFile(categoryRow({ status: '' })),
        expect: [{ code: 'MISSING_REQUIRED', rowNumber: 2, column: 'status' }]
      },
      {
        name: 'neither (both are said, in column order)',
        file: categoryFile(categoryRow({ name: '', status: '' })),
        expect: [
          { code: 'MISSING_REQUIRED', rowNumber: 2, column: 'name' },
          { code: 'MISSING_REQUIRED', rowNumber: 2, column: 'status' }
        ]
      }
    ]
  }
});

export const CAT_02 = defineRule({
  id: 'CAT-02',
  entity: 'category',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'url_key: lowercase letters, digits and single hyphens; 1 to 255 characters.',
  examples: {
    pass: [
      {
        name: 'letters, digits and hyphens',
        file: categoryFile(categoryRow({ url_key: 'women-shoes-2' })),
        expect: []
      },
      {
        name: 'exactly 255 characters',
        file: categoryFile(categoryRow({ url_key: 'a'.repeat(255) })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a space and a capital',
        file: categoryFile(categoryRow({ url_key: 'Women Shoes' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'url_key' }]
      },
      {
        name: 'a double hyphen',
        file: categoryFile(categoryRow({ url_key: 'women--shoes' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'url_key' }]
      },
      {
        name: 'a hyphen at the end',
        file: categoryFile(categoryRow({ url_key: 'women-' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'url_key' }]
      },
      {
        name: '256 characters',
        file: categoryFile(categoryRow({ url_key: 'a'.repeat(256) })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'url_key' }]
      }
    ]
  }
});

export const CAT_03 = defineRule({
  id: 'CAT-03',
  entity: 'category',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'status: 0 or 1. The category schema does not accept true or false; ALL-10 converts them.',
  examples: {
    pass: [
      {
        name: '0',
        file: categoryFile(categoryRow({ status: '0' })),
        expect: []
      }
    ],
    fail: [
      {
        name: '2',
        file: categoryFile(categoryRow({ status: '2' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'status' }]
      }
    ]
  }
});

export const CAT_04 = defineRule({
  id: 'CAT-04',
  entity: 'category',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'position: a whole number from 0 to 32,767 (ALL-20).',
  examples: {
    pass: [
      {
        name: 'a whole number',
        file: categoryFile(categoryRow({ position: '12' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a negative number',
        file: categoryFile(categoryRow({ position: '-1' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'position' }]
      },
      {
        name: 'a decimal',
        file: categoryFile(categoryRow({ position: '1.5' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'position' }]
      }
    ]
  }
});

export const CAT_05 = defineRule({
  id: 'CAT-05',
  entity: 'category',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'REFERENCE_NOT_FOUND',
  testedBy: 'example',
  summary:
    'parent (by url_key) exists in the store or is a category of the same file, in any order.',
  examples: {
    pass: [
      {
        name: 'the child comes before its parent in the file',
        file: categoryFile(A_PARENT('tops', 'women'), categoryRow()),
        expect: []
      },
      {
        name: 'the parent is in the store',
        store: STORE_WITH_WOMEN,
        file: categoryFile(A_PARENT('tops', 'women')),
        expect: []
      },
      {
        name: 'letter case does not matter (a reference)',
        file: categoryFile(categoryRow(), A_PARENT('tops', 'WOMEN')),
        expect: []
      }
    ],
    fail: [
      {
        name: 'no such parent',
        file: categoryFile(A_PARENT('tops', 'nowhere')),
        expect: [
          { code: 'REFERENCE_NOT_FOUND', rowNumber: 2, column: 'parent' }
        ]
      }
    ]
  }
});

export const CAT_06 = defineRule({
  id: 'CAT-06',
  entity: 'category',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'PARENT_CYCLE',
  testedBy: 'example',
  summary:
    'No cycle: a category is not its own parent or descendant, in the file or through the store tree.',
  examples: {
    pass: [
      {
        name: 'a chain of three',
        file: categoryFile(
          categoryRow(),
          A_PARENT('tops', 'women'),
          A_PARENT('shirts', 'tops')
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'its own parent',
        file: categoryFile(A_PARENT('women', 'women')),
        expect: [{ code: 'PARENT_CYCLE', rowNumber: 2, column: 'parent' }]
      },
      {
        name: "two categories that are each other's parent (both are said)",
        file: categoryFile(A_PARENT('a', 'b'), A_PARENT('b', 'a')),
        expect: [
          { code: 'PARENT_CYCLE', rowNumber: 2, column: 'parent' },
          { code: 'PARENT_CYCLE', rowNumber: 3, column: 'parent' }
        ]
      },
      {
        name: 'a cycle that goes through a category of the store',
        store: {
          categories: [
            { urlKey: 'a', name: 'a', status: 1 },
            { urlKey: 'b', name: 'b', status: 1, parentUrlKey: 'a' }
          ]
        },
        file: categoryFile(A_PARENT('a', 'b')),
        expect: [{ code: 'PARENT_CYCLE', rowNumber: 2, column: 'parent' }]
      }
    ]
  }
});

export const CAT_08 = defineRule({
  id: 'CAT-08',
  entity: 'category',
  layer: 'K',
  source: 'engine',
  op: 'B',
  code: 'URL_KEY_RESERVED',
  testedBy: 'example',
  summary:
    'url_key is not a reserved route or an enabled language code (core does not check this for categories).',
  examples: {
    pass: [
      {
        name: 'a key that only starts like a route',
        store: { reservedUrlKeys: ['cart', 'vi'] },
        file: categoryFile(categoryRow({ url_key: 'cartwheel' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a route',
        store: { reservedUrlKeys: ['cart', 'vi'] },
        file: categoryFile(categoryRow({ url_key: 'cart' })),
        expect: [{ code: 'URL_KEY_RESERVED', rowNumber: 2, column: 'url_key' }]
      },
      {
        name: 'a language code',
        store: { reservedUrlKeys: ['cart', 'vi'] },
        file: categoryFile(categoryRow({ url_key: 'vi' })),
        expect: [{ code: 'URL_KEY_RESERVED', rowNumber: 2, column: 'url_key' }]
      }
    ]
  }
});

export const CAT_09 = defineRule({
  id: 'CAT-09',
  entity: 'category',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'A blank url_key is derived from the name with slugify (D-24) before the row is matched with a stored category; if nothing survives the row is refused.',
  examples: {
    pass: [
      {
        name: 'derived from the name, a new category',
        file: categoryFile(categoryRow({ url_key: '', name: 'Men Shoes' })),
        expect: []
      },
      {
        name: 'derived again on a re-run: the same key finds the stored category',
        mode: 'update',
        store: {
          categories: [{ urlKey: 'men-shoes', name: 'Men Shoes', status: 1 }]
        },
        file: categoryFile(categoryRow({ url_key: '', name: 'Men Shoes' })),
        expect: []
      },
      {
        name: 'accents are removed',
        file: categoryFile(categoryRow({ url_key: '', name: 'Áo thun nam' })),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a name with no Latin letters',
        file: categoryFile(categoryRow({ url_key: '', name: '黑色星期五' })),
        expect: [{ code: 'MISSING_REQUIRED', rowNumber: 2, column: 'url_key' }]
      },
      {
        name: 'a name of only punctuation',
        file: categoryFile(categoryRow({ url_key: '', name: '!!!' })),
        expect: [{ code: 'MISSING_REQUIRED', rowNumber: 2, column: 'url_key' }]
      }
    ]
  }
});

export const IMG_01 = defineRule({
  id: 'IMG-01',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'Each image is a valid http or https URL (no local paths in v1).',
  examples: {
    pass: [
      {
        name: 'an https address',
        file: categoryFile(
          categoryRow({ image: 'https://cdn.example.com/a.jpg' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a local path',
        file: categoryFile(categoryRow({ image: '/tmp/a.jpg' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'image' }]
      },
      {
        name: 'ftp',
        file: categoryFile(categoryRow({ image: 'ftp://example.com/a.jpg' })),
        expect: [{ code: 'INVALID_VALUE', rowNumber: 2, column: 'image' }]
      }
    ]
  }
});

export const CATEGORY_RULES = [
  CAT_01,
  CAT_02,
  CAT_03,
  CAT_04,
  CAT_05,
  CAT_06,
  CAT_08,
  CAT_09,
  IMG_01
];
