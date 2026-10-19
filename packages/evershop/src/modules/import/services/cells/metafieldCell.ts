import type { MetafieldField } from '../ports/lookup.js';
import { descriptionToRows } from './description.js';
import type { DescriptionDeps } from './description.js';
import {
  accept,
  parseBoolean,
  parseColor,
  parseDate,
  parseJson,
  parseList,
  refuse
} from './parsers.js';
import type { CellResult } from './parsers.js';

/**
 * A custom-field cell (`metafield:<namespace>.<key>`) read as a value of its
 * definition (§ 5.9): text for the text types, a number, a boolean, a date, a
 * color, the editor's rows for rich text, JSON for a group. A list of scalars
 * is `|`-separated, a list of groups or of rich texts is a JSON array. The cell is
 * already trimmed and not blank. The value is in the form core stores; whether it
 * also passes the validations of the definition is the check of the store
 * (`StoredMetafield.check`), which this does not know.
 */
export function convertMetafieldCell(
  field: MetafieldField,
  text: string,
  deps: DescriptionDeps
): CellResult<unknown> {
  if (field.type === 'group') {
    return parseJson(text, field.isList ? 'array' : 'object');
  }
  if (field.type === 'rich_text') {
    if (field.isList) {
      // A list of documents: [{ "content": Row[] }, ...]
      return parseJson(text, 'array');
    }
    const rows = descriptionToRows(text, deps);
    return rows === null
      ? refuse('INVALID_VALUE', { reason: 'blank' }, 'is empty.')
      : accept(rows);
  }
  if (!field.isList) {
    return convertScalar(field, text);
  }
  const values: unknown[] = [];
  for (const [index, item] of parseList(text).entries()) {
    const converted = convertScalar(field, item);
    if (!converted.ok) {
      return {
        ...converted,
        params: { ...converted.params, item: index + 1 },
        problem: `has an item that is not valid (item ${index + 1}): it ${
          converted.problem
        }`
      };
    }
    values.push(converted.value);
  }
  return accept(values);
}

function convertScalar(
  field: MetafieldField,
  text: string
): CellResult<unknown> {
  switch (field.type) {
    case 'short_text':
    case 'long_text':
      return accept(text);
    case 'url':
      return isAbsoluteUrl(text)
        ? accept(text)
        : refuse(
            'INVALID_VALUE',
            { reason: 'not_url' },
            'must be an address with a scheme, such as https://example.com, and no spaces.'
          );
    case 'integer':
      return /^-?[0-9]+$/.test(text) && Number.isSafeInteger(Number(text))
        ? accept(Number(text))
        : refuse(
            'INVALID_VALUE',
            { reason: 'not_integer' },
            'must be a whole number, such as 12 or -3.'
          );
    case 'number':
      return /^-?[0-9]+(\.[0-9]+)?$/.test(text) && Number.isFinite(Number(text))
        ? accept(Number(text))
        : refuse(
            'INVALID_VALUE',
            { reason: 'not_number' },
            'must be a number, such as 12 or 3.5: no comma and no thousands separator.'
          );
    case 'boolean': {
      const parsed = parseBoolean(text);
      return parsed.ok ? accept(parsed.value === 1) : parsed;
    }
    case 'date':
      return parseDate(text);
    case 'color':
      return parseColor(text);
    default:
      return refuse(
        'INVALID_VALUE',
        { reason: 'unsupported_type', type: field.type },
        `has a type that the import cannot read (${field.type}).`
      );
  }
}

function isAbsoluteUrl(text: string): boolean {
  if (/[\s\u0000-\u001f\u007f]/.test(text)) {
    return false;
  }
  try {
    // Throws when there is no scheme.
    new URL(text);
    return true;
  } catch {
    return false;
  }
}
