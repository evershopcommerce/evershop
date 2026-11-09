import { defineRule } from './rule.js';

/**
 * The rules of the import phase (§ 7.4, `IMP`, and `CAT-07`). They come from the
 * writer and the runner, not from a row example: each names the test that proves
 * it. Only the ones the category writer enforces are here.
 */
const WRITER_TEST = 'tests/unit/write/categoryWriter.test.ts';

export const CAT_07 = defineRule({
  id: 'CAT-07',
  entity: 'category',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'DEPENDENCY_FAILED',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'A child of a failed parent is skipped, and so is the child of a skipped one.'
});

export const IMP_01 = defineRule({
  id: 'IMP-01',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'WRITE_FAILED',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'Each row is one transaction. Any service error makes the row failed with the service message.'
});

export const IMP_02 = defineRule({
  id: 'IMP-02',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'CONFLICT',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'A unique-constraint hit (SKU, url_key, email) is reported with a readable message and the column.'
});

export const IMP_03 = defineRule({
  id: 'IMP-03',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'IMAGE_UNREADABLE',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'An image that cannot be fetched fails the row before anything is written.'
});

const PRODUCT_WRITER_TEST = 'tests/unit/write/productWriter.test.ts';

export const IMP_04 = defineRule({
  id: 'IMP-04',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'DEPENDENCY_FAILED',
  testedBy: 'runner',
  test: PRODUCT_WRITER_TEST,
  summary:
    'A row whose dependency failed is skipped: the members of a new variant group when its first member or the group itself failed.'
});

export const IMP_05 = defineRule({
  id: 'IMP-05',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'WRITE_FAILED',
  testedBy: 'runner',
  test: PRODUCT_WRITER_TEST,
  summary:
    'A row that can end half done (a product saved without its redirects, a member saved but not in its group) is reported failed, and a re-run completes it.'
});

export const IMP_06 = defineRule({
  id: 'IMP-06',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'WRITE_FAILED',
  alsoCodes: ['IMAGE_UNREADABLE'],
  testedBy: 'runner',
  test: 'tests/unit/write/categoryWriter.test.ts and retry.test.ts',
  summary:
    'A transient failure is retried up to 3 times with waits before the row is failed; a failure that is not transient fails at once.'
});

export const IMP_07 = defineRule({
  id: 'IMP-07',
  entity: 'all',
  layer: 'I',
  source: 'engine',
  op: 'B',
  code: 'ALREADY_EXISTS',
  testedBy: 'runner',
  test: WRITER_TEST,
  summary:
    'On a resumed job the units after the last save are not checked against mode create: a record that exists there is updated.'
});

export const IMPORT_PHASE_RULES = [
  CAT_07,
  IMP_01,
  IMP_02,
  IMP_03,
  IMP_04,
  IMP_05,
  IMP_06,
  IMP_07
];
