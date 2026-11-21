import { listMetafieldDefinitions } from './definition.js';
import { createFieldValidator } from './fieldValidator.js';
import type { MetaData } from './types.js';

export { createFieldValidator } from './fieldValidator.js';
export type { FieldCheck } from './fieldValidator.js';

function validateError(message: string): Error {
  return Object.assign(new Error(message), { status: 400 });
}

/**
 * Validate a full values object against an owner type's definitions and return
 * the object to persist into the entity's `meta_data` column (defaults applied,
 * unknown keys dropped, repeater `_id` stripped). Throws (status 400) on the
 * first failure, with a field-scoped message.
 */
export async function validateMetafields(
  ownerType: string,
  input: MetaData = {}
): Promise<MetaData> {
  const definitions = await listMetafieldDefinitions(ownerType);
  const result: MetaData = {};

  for (const def of definitions) {
    const checked = createFieldValidator(def)(
      input?.[def.namespace]?.[def.key]
    );
    if (!checked.ok) {
      throw validateError(checked.message);
    }
    if (checked.value !== undefined) {
      (result[def.namespace] ??= {})[def.key] = checked.value;
    }
  }

  return result;
}

/**
 * Validate a single field's value against its definition (for partial /
 * out-of-band writes). Returns the cleaned value or throws (status 400).
 */
export async function validateMetafield(
  ownerType: string,
  namespace: string,
  key: string,
  value: unknown
): Promise<unknown> {
  const definitions = await listMetafieldDefinitions(ownerType);
  const def = definitions.find(
    (d) => d.namespace === namespace && d.key === key
  );
  if (!def) {
    throw validateError(`No metafield "${namespace}.${key}" on "${ownerType}"`);
  }
  const checked = createFieldValidator(def)(value);
  if (!checked.ok) {
    throw validateError(checked.message);
  }
  return checked.value;
}
