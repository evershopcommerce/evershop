import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';
import addFormats from 'ajv-formats';

/**
 * @param {{ useDefaults?: boolean | 'empty' }} [options]
 *   `useDefaults` decides whether the `default` keywords of a schema are written
 *   into the payload while it is validated (Ajv does it IN PLACE). The default,
 *   `'empty'`, is right for a create: a missing field gets its default. It is
 *   wrong for an update that may carry only the fields to change: every omitted
 *   field that has a `default` would be written back as that default and reset.
 *   Update validators pass `{ useDefaults: false }`.
 */
export function getAjv({ useDefaults = 'empty' } = {}) {
  // Initialize the ajv instance
  const ajv = new Ajv({
    strict: false,
    useDefaults,
    allErrors: true
  });

  // Add the formats
  addFormats(ajv);
  ajv.addFormat('digit', /^[0-9]*$/);
  ajvErrors(ajv);

  return ajv;
}
