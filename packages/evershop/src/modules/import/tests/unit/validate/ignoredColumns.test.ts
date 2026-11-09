import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { mostColumnsIgnored } from '../../../services/validate/ignoredColumns.js';
import { createIssue } from '../../../services/issues.js';
import { say } from '../../../services/say.js';
import {
  validateCategories,
  validateEntity
} from '../helpers/runValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(path.resolve(here, '../../fixtures', name));

const header = (...columns: string[]) => ({
  columns,
  position: new Map(columns.map((column, at) => [column, at]))
});
const unknown = (column: string) =>
  createIssue({ code: 'UNKNOWN_COLUMN', column, message: `${column}.` });

describe('most of the columns are ignored (ALL-24)', () => {
  it('says so once, first, for a products file uploaded as categories, and the rows are still read', async () => {
    const products = fixture('products.csv');
    const columns = products.toString('utf8').split('\n')[0].split(',');
    const result = await validateCategories(products);
    const known = new Set([
      'url_key',
      'name',
      'parent',
      'status',
      'position',
      'description',
      'meta_title',
      'meta_description',
      'image'
    ]);
    const ignored = columns.filter((column) => !known.has(column));
    // a `metafield:` column that the store does not have is an error of its own,
    // not an ignored column (an `attr:` column is ignored in a categories file)
    const plain = ignored.filter((column) => !column.startsWith('metafield:'));
    const first = result.issues[0];
    expect(first.code).toBe('COLUMNS_IGNORED');
    expect(first.severity).toBe('warning');
    expect(first.message).toBe(
      `${plain.length} of ${columns.length} columns were ignored because this type of file does not use them. If that is not what you expected, check that you chose the right type of file.`
    );
    expect(first.params).toEqual({
      ignored: plain.length,
      total: columns.length
    });
    expect(
      result.issues.filter((i) => i.code === 'COLUMNS_IGNORED')
    ).toHaveLength(1);
    expect(result.summary.stopped).toBe(false);
    expect(result.summary.totalRows).toBeGreaterThan(0);
  });

  it('says it in words that a translation can reorder, and keeps the numbers as values', () => {
    const issue = mostColumnsIgnored(header('url_key', 'name', 'a', 'b', 'c'), [
      unknown('a'),
      unknown('b'),
      unknown('c')
    ]);
    expect(issue?.message).toBe(
      '3 of 5 columns were ignored because this type of file does not use them. If that is not what you expected, check that you chose the right type of file.'
    );
    expect(issue?.say).toEqual(
      createIssue({
        code: 'COLUMNS_IGNORED',
        message: say`${3} of ${5} columns were ignored because this type of file does not use them. If that is not what you expected, check that you chose the right type of file.`
      }).say
    );
  });

  it.each([
    ['none ignored', ['url_key', 'name'], []],
    ['one in three', ['url_key', 'name', 'a'], ['a']],
    ['exactly half', ['url_key', 'name', 'a', 'b'], ['a', 'b']]
  ])('does not say it when %s', (_name, columns, ignored) => {
    expect(
      mostColumnsIgnored(header(...columns), ignored.map(unknown))
    ).toBeNull();
  });

  it('says it when just over half are ignored', () => {
    expect(
      mostColumnsIgnored(header('url_key', 'a', 'b'), [
        unknown('a'),
        unknown('b')
      ])
    ).not.toBeNull();
  });

  it('counts a column once, even when its name is repeated, and not a column without a name', () => {
    // 2 names that are ignored (a twice, b) of 4 different names + 1 blank: 2 of 4
    expect(
      mostColumnsIgnored(header('url_key', 'name', 'a', 'a', 'b', ''), [
        unknown('a'),
        unknown('a'),
        unknown('b')
      ])
    ).toBeNull();
    // 3 of 5
    expect(
      mostColumnsIgnored(header('url_key', 'name', 'a', 'a', 'b', 'c', ''), [
        unknown('a'),
        unknown('b'),
        unknown('c')
      ])?.params
    ).toEqual({ ignored: 3, total: 5 });
  });

  it('does not count a custom-field column that the store lacks: that is an error of its own', async () => {
    const result = await validateCategories(
      'url_key,name,metafield:custom.a,metafield:custom.b,metafield:custom.c\nwomen,Women,x,y,z\n'
    );
    expect(result.issues.map((issue) => issue.code)).not.toContain(
      'COLUMNS_IGNORED'
    );
  });

  it('is the same for every kind of file', async () => {
    const result = await validateEntity(
      'customer',
      'email,full_name,a,b,c,d\njane@example.test,Jane,1,2,3,4\n'
    );
    expect(result.issues[0]).toMatchObject({
      code: 'COLUMNS_IGNORED',
      params: { ignored: 4, total: 6 }
    });
  });
});
