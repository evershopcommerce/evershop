import type { HeaderInfo } from '../entities/definition.js';
import { ALL_24 } from '../rules/allRules.js';
import { say } from '../say.js';
import type { Say } from '../say.js';
import type { ImportEntity, ImportIssue } from '../types.js';

/**
 * A column that only one kind of file has: the natural key of the products
 * (`sku`) and of the customers (`email`, which a customer addresses file has
 * too). A file that has it was most likely made for another kind of import.
 *
 * Without this, a products file uploaded as categories is "valid": it has
 * `url_key`, `name` and `status` like a category file does, the 17 other
 * columns are only warnings, and starting the import creates a category for
 * every product.
 */
const SIGNATURES: ReadonlyArray<{
  column: string;
  belongsTo: readonly ImportEntity[];
  looksLike: Say;
}> = [
  { column: 'sku', belongsTo: ['product'], looksLike: say`a products file` },
  {
    column: 'email',
    belongsTo: ['customer', 'customerAddress'],
    looksLike: say`a customers file or a customer addresses file`
  }
];

/**
 * The problem to report when the header says the file is not of the kind the
 * admin chose, or null. It is a file-level error: the rows are not read, because
 * every message about them would be about the wrong kind of file.
 */
export function wrongFileType(
  header: HeaderInfo,
  entity: ImportEntity
): ImportIssue | null {
  for (const { column, belongsTo, looksLike } of SIGNATURES) {
    if (header.position.has(column) && !belongsTo.includes(entity)) {
      return ALL_24.issue({
        column,
        params: { column },
        message: say`This looks like ${looksLike}: it has a "${column}" column. Choose the right type of file when you upload, or remove that column.`
      });
    }
  }
  return null;
}
