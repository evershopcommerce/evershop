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

/** A single editor block carries real content (non-empty text / items / media). */
function blockHasContent(block: any): boolean {
  const data = block?.data;
  if (!data || typeof data !== 'object') return false;
  if (typeof data.text === 'string') {
    // Strip inline HTML/whitespace: an empty paragraph block is not content.
    return data.text.replace(/<[^>]*>/g, '').trim().length > 0;
  }
  if (Array.isArray(data.items)) return data.items.length > 0;
  // image / raw / productList / etc. — any populated block counts as content.
  return Object.keys(data).length > 0;
}

/** True when block-editor content (Row[]) has at least one non-empty block. */
function richTextHasBlocks(rows: unknown): boolean {
  return (
    Array.isArray(rows) &&
    rows.some(
      (row: any) =>
        Array.isArray(row?.columns) &&
        row.columns.some(
          (col: any) =>
            Array.isArray(col?.data?.blocks) &&
            col.data.blocks.some(blockHasContent)
        )
    )
  );
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

  // rich_text is EverShop block-editor content (Row[]). A list holds one document
  // per item as `{ content: Row[] }`. Structurally-empty content (no blocks in any
  // column) counts as unset — `required` is enforced and empty editor shells /
  // empty items are dropped rather than persisted.
  if (field.type === 'rich_text') {
    if (field.isList) {
      if (!Array.isArray(value)) return undefined;
      const items = (value as any[])
        .map((item) =>
          item && typeof item === 'object' ? (item as any).content : undefined
        )
        .filter((rows) => richTextHasBlocks(rows))
        .map((rows) => ({ content: rows }));
      return items.length ? items : undefined;
    }
    return richTextHasBlocks(value) ? value : undefined;
  }

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
