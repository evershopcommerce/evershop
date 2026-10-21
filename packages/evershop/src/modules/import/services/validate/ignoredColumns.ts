import type { HeaderInfo } from '../entities/definition.js';
import { ALL_24 } from '../rules/allRules.js';
import { say } from '../say.js';
import type { ImportIssue } from '../types.js';

/**
 * The one warning that says how much of the file the engine does not read.
 *
 * Each column that is not a column of the type gets its own `UNKNOWN_COLUMN`
 * warning, and a file made for another type has dozens of them: a products file
 * uploaded as Categories is valid (it has `url_key`, `name` and `status`) with
 * 17 warnings, which reads as "fine". When more than half of the columns are
 * ignored this says so once, and tells the admin to check the type. It is only a
 * warning: a file from another system can have many columns the engine does not
 * know and still be the right file.
 *
 * `issues` are what the header check found; the columns it ignored are the
 * names of its `UNKNOWN_COLUMN` warnings.
 */
export function mostColumnsIgnored(
  header: HeaderInfo,
  issues: readonly ImportIssue[]
): ImportIssue | null {
  const named = new Set(header.columns.filter((column) => column !== ''));
  const ignored = new Set(
    issues
      .filter((issue) => issue.code === 'UNKNOWN_COLUMN')
      .map((issue) => issue.column)
  ).size;
  if (ignored === 0 || ignored * 2 <= named.size) {
    return null;
  }
  return ALL_24.issue({
    params: { ignored, total: named.size },
    message: say`${ignored} of ${named.size} columns were ignored because this type of file does not use them. If that is not what you expected, check that you chose the right type of file.`
  });
}
