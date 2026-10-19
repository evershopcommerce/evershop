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

export type FieldCheck =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

/**
 * The check of one definition, compiled once and applied to any number of
 * values: blank is "not provided" (an error only when the definition is
 * `required`), the value is normalized, stripped of the editor's `_id`s and
 * validated against the schema of the definition. The message names the field
 * (`"namespace.key": …`). `validateMetafields` and `validateMetafield` are made of
 * this; a caller with many values for one definition (a bulk import) makes the
 * check once, because compiling the schema costs far more than applying it.
 */
export function createFieldValidator(
  def: MetafieldDefinition
): (value: unknown) => FieldCheck {
  const descriptor = descriptorOf(def);
  const name = `${def.namespace}.${def.key}`;
  // Compiled at the first value: a definition nobody has a value for costs nothing.
  let validate: ReturnType<ReturnType<typeof getAjv>['compile']> | undefined;
  return (value) => {
    const normalized = normalize(descriptor, value);
    if (normalized === undefined) {
      return def.required
        ? { ok: false, message: `"${name}" is required` }
        : { ok: true, value: undefined };
    }
    const cleaned = stripUiKeys(normalized);
    validate ??= getAjv().compile(compileField(descriptor));
    if (!validate(cleaned)) {
      const msg = validate.errors?.[0]?.message ?? 'invalid value';
      return { ok: false, message: `"${name}": ${msg}` };
    }
    return { ok: true, value: cleaned };
  };
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
