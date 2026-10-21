import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { createIssue } from '../../../services/issues.js';
import { say } from '../../../services/say.js';
import { wrongFileType } from '../../../services/validate/wrongFileType.js';
import type { ImportEntity } from '../../../services/types.js';
import { validateEntity } from '../helpers/runValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(path.resolve(here, '../../fixtures', name));

const FILES: Record<ImportEntity, Buffer> = {
  category: fixture('categories.csv'),
  product: fixture('products.csv'),
  customer: fixture('customers.csv'),
  customerAddress: fixture('customer-addresses.csv')
};

const header = (...columns: string[]) => ({
  columns,
  position: new Map(columns.map((column, at) => [column, at]))
});

describe('a file of the wrong type (ALL-24)', () => {
  it('refuses a products file uploaded as categories, and says what it looks like', async () => {
    const result = await validateEntity('category', FILES.product);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'WRONG_FILE_TYPE',
      severity: 'error',
      column: 'sku',
      params: { column: 'sku' },
      message:
        'This looks like a products file: it has a "sku" column. Choose the right type of file when you upload, or remove that column.'
    });
    // No row is read: 17 warnings about columns would say nothing useful.
    expect(result.summary).toMatchObject({
      stopped: true,
      errors: 1,
      warnings: 0,
      createRows: 0,
      updateRows: 0
    });
    expect(result.opened).toBe(1);
  });

  // [file of, uploaded as, what the check says]. Where the file has the key of
  // its own kind and not the other one's, the missing key is what is reported.
  const CASES: Array<[ImportEntity, ImportEntity, string]> = [
    ['product', 'category', 'WRONG_FILE_TYPE'],
    ['customer', 'category', 'WRONG_FILE_TYPE'],
    ['customerAddress', 'category', 'WRONG_FILE_TYPE'],
    ['customer', 'product', 'WRONG_FILE_TYPE'],
    ['customerAddress', 'product', 'WRONG_FILE_TYPE'],
    ['product', 'customer', 'WRONG_FILE_TYPE'],
    ['product', 'customerAddress', 'WRONG_FILE_TYPE'],
    ['category', 'product', 'MISSING_COLUMN'],
    ['category', 'customer', 'MISSING_COLUMN'],
    ['category', 'customerAddress', 'MISSING_COLUMN']
  ];
  it.each(CASES)(
    'the %s example file uploaded as %s: the first problem is %s, and nothing is read',
    async (fileOf, uploadedAs, code) => {
      const result = await validateEntity(uploadedAs, FILES[fileOf]);
      expect(result.issues[0].code).toBe(code);
      expect(result.summary.stopped).toBe(true);
      expect(result.summary.createRows + result.summary.updateRows).toBe(0);
    }
  );

  it('does not refuse the example file of each kind uploaded as itself', async () => {
    for (const entity of Object.keys(FILES) as ImportEntity[]) {
      const result = await validateEntity(entity, FILES[entity], {
        store: undefined
      });
      expect(result.issues.map((issue) => issue.code)).not.toContain(
        'WRONG_FILE_TYPE'
      );
    }
  });

  it('does not tell a customers file from a customer addresses file: both have the e-mail', () => {
    const file = header('email', 'full_name');
    expect(wrongFileType(file, 'customer')).toBeNull();
    expect(wrongFileType(file, 'customerAddress')).toBeNull();
  });

  it('leaves any other unknown column a warning', async () => {
    const result = await validateEntity(
      'category',
      'url_key,name,status,colour\nwomen,Women,1,red\n'
    );
    expect(result.issues.map((issue) => [issue.code, issue.severity])).toEqual([
      ['UNKNOWN_COLUMN', 'warning']
    ]);
    expect(result.summary.stopped).toBe(false);
  });

  it('keeps the words of the file in its own sentence, so that a translation can reorder them', () => {
    const issue = wrongFileType(header('sku'), 'category');
    expect(issue?.say?.t).toBe(
      'This looks like ${1}: it has a "${2}" column. Choose the right type of file when you upload, or remove that column.'
    );
    const same = createIssue({
      code: 'WRONG_FILE_TYPE',
      message: say`This looks like ${say`a products file`}: it has a "${'sku'}" column. Choose the right type of file when you upload, or remove that column.`
    });
    expect(issue?.say).toEqual(same.say);
  });
});
