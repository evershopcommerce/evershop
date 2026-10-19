import type { AddressProblem } from '../../ports/lookup.js';
import { ADR_04 } from '../../rules/customerAddressRules.js';
import type { ImportIssue } from '../../types.js';

// The columns of the file that are the shared columns of an address.
const SHARED_COLUMNS: ReadonlySet<string> = new Set([
  'recipient',
  'given_name',
  'family_name',
  'organization',
  'address_line_1',
  'address_line_2',
  'address_line_3',
  'dependent_locality',
  'locality',
  'administrative_area',
  'postal_code',
  'sorting_code',
  'country',
  'telephone'
]);

/**
 * What core said about an address, as issues (ADR-03 to ADR-09): every one is
 * `ADDRESS_INVALID`, keeps the registry's field and code in `params`, and is
 * placed on the column of the field (an extra field is placed on `extra`).
 */
export function addressIssues(
  problems: readonly AddressProblem[],
  rowNumber: number
): ImportIssue[] {
  return problems.map((problem) => {
    const column =
      problem.field === undefined
        ? undefined
        : SHARED_COLUMNS.has(problem.field)
        ? problem.field
        : 'extra';
    return ADR_04.issue({
      rowNumber,
      column,
      params: { field: problem.field ?? null, reason: problem.code },
      message: problem.message
    });
  });
}
