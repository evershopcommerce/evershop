import { getAjv } from '../../modules/base/services/getAjv.js';
import { compileField } from './compileField.js';
import { listMetafieldDefinitions } from './definition.js';
import type { FieldDescriptor, MetaData, MetafieldDefinition } from './types.js';

function descriptorOf(def: MetafieldDefinition): FieldDescriptor {
  return {
    key: def.key,
    name: def.name,
    type: def.type,
    isList: def.isList,
    required: def.required,
    validations: def.validations,
    appearance: def.appearance,
    referenceType: def.referenceType,
    subFields: def.subFields
  };
}

/** Strip UI-only `_id` keys (repeater item identity) recursively. */
function stripUiKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUiKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '_id') continue;
      out[k] = stripUiKeys(v);
    }
    return out;
  }
  return value;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Coerce an "empty" value to `undefined` so untouched optional fields are treated
 * as not-provided rather than validated. The form serializes every field on
 * submit (empty strings, `{}`, half-filled reference/money objects); without this
 * a single untouched `date`/`color`/`reference` field would fail AJV and abort the
 * whole save. Type-aware so legitimate falsy scalars (`false`, `0`) survive.
 */
function normalize(field: FieldDescriptor, value: unknown): unknown {
  if (isBlank(value)) return undefined;

  if (field.isList) {
    if (!Array.isArray(value)) return undefined;
    const items = value
      .map((item) => normalize({ ...field, isList: false }, item))
      .filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }

  if (field.type === 'group') {
    if (typeof value !== 'object') return undefined;
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const sub of field.subFields ?? []) {
      const nv = normalize(sub, src[sub.key]);
      if (nv !== undefined) out[sub.key] = nv;
    }
    return Object.keys(out).length ? out : undefined;
  }

  if (field.type === 'reference') {
    const v = value as { referenceType?: unknown; id?: unknown };
    // The default `referenceType` alone is not a value — an empty `id` means unset.
    if (isBlank(v.id)) return undefined;
    return { referenceType: v.referenceType, id: v.id };
  }

  if (field.type === 'money') {
    const v = value as { amount?: unknown };
    if (isBlank(v.amount)) return undefined;
    return value;
  }

  return value;
}

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
  const ajv = getAjv();
  const result: MetaData = {};

  for (const def of definitions) {
    const descriptor = descriptorOf(def);
    const value = normalize(descriptor, input?.[def.namespace]?.[def.key]);

    if (value === undefined) {
      if (def.required) {
        throw validateError(`"${def.namespace}.${def.key}" is required`);
      }
      continue;
    }

    const cleaned = stripUiKeys(value);
    const validate = ajv.compile(compileField(descriptor));
    if (!validate(cleaned)) {
      const msg = validate.errors?.[0]?.message ?? 'invalid value';
      throw validateError(`"${def.namespace}.${def.key}": ${msg}`);
    }

    (result[def.namespace] ??= {})[def.key] = cleaned;
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
  const descriptor = descriptorOf(def);
  const normalized = normalize(descriptor, value);
  if (normalized === undefined) {
    if (def.required) {
      throw validateError(`"${namespace}.${key}" is required`);
    }
    return undefined;
  }
  const cleaned = stripUiKeys(normalized);
  const ajv = getAjv();
  const validate = ajv.compile(compileField(descriptor));
  if (!validate(cleaned)) {
    const msg = validate.errors?.[0]?.message ?? 'invalid value';
    throw validateError(`"${namespace}.${key}": ${msg}`);
  }
  return cleaned;
}
