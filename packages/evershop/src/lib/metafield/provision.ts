import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Ajv } from 'ajv';
import type { Pool } from 'pg';
import { emit } from '../event/emitter.js';
import { compileField } from './compileField.js';
import { rowToDefinition } from './definition.js';
import { MAX_DEPTH, METAFIELD_TYPES } from './types.js';
import type {
  FieldDescriptor,
  MetafieldDefinition,
  MetafieldType,
  Validation
} from './types.js';

/**
 * Theme-declared metafield definition — the `theme.json`
 * `metafieldDefinitions[]` entry shape. Field names follow the lib's
 * FieldDescriptor (`key`/`type`), NOT the REST API's `fieldKey`/`fieldType`.
 *
 * `required` is deliberately absent from the supported surface: seeding a
 * required definition would make `validateMetafields` reject EVERY entity
 * save store-wide until values are backfilled, so the validator refuses it.
 */
export interface ManifestMetafieldDefinition {
  ownerType: string;
  namespace: string;
  key: string;
  name: string;
  description?: string;
  type: MetafieldType;
  isList?: boolean;
  required?: boolean;
  translatable?: boolean;
  visibleToCustomer?: boolean;
  validations?: Validation[];
  subFields?: FieldDescriptor[];
  appearance?: Record<string, unknown>;
}

export interface ManifestDefinitionIssue {
  /** Index into the metafieldDefinitions array; -1 for array-level issues. */
  index: number;
  message: string;
}

export interface ProvisionConflictDetail {
  field: 'type' | 'isList';
  declared: unknown;
  incumbent: unknown;
}

export interface ProvisionResult {
  /** 'owner.namespace.key' refs, per outcome. */
  seeded: string[];
  adopted: string[];
  /** Report-only (no stored state): definitions attributed to this theme
   *  that its current manifest no longer declares — left in place. */
  retired: string[];
  conflicts: Array<{ ref: string; details: ProvisionConflictDetail[] }>;
  warnings: ManifestDefinitionIssue[];
  errors: ManifestDefinitionIssue[];
  /** True when the attribution column doesn't exist yet (unmigrated DB —
   *  e.g. `theme:active` before the server ever booted this core version). */
  skipped: boolean;
}

/**
 * Owners with the full metafield wiring (meta_data column, write path, prune
 * subscriber, storefront GraphQL, admin card). `owner_type` itself is an open
 * varchar, so other strings are accepted — but a definition for an unwired
 * owner is silently inert, hence the lint warning.
 */
export const WIRED_METAFIELD_OWNERS: readonly string[] = [
  'product',
  'category',
  'collection',
  'customer',
  'order',
  'shop',
  'blog_post',
  'blog_category'
];

const KEY_PATTERN = '^[a-z][a-z0-9_]*$';

/** JSON Schema for one manifest entry; `field` is the recursive sub-field core. */
const ENTRY_SCHEMA = {
  $id: 'themeMetafieldDefinition',
  definitions: {
    validation: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: { enum: ['size', 'range', 'regexp', 'choices'] },
        min: { type: 'number' },
        max: { type: 'number' },
        pattern: { type: 'string' },
        values: { type: 'array', items: { type: ['string', 'number'] } }
      }
    },
    field: {
      type: 'object',
      additionalProperties: false,
      required: ['key', 'name', 'type'],
      properties: {
        key: { type: 'string', pattern: KEY_PATTERN, maxLength: 64 },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string' },
        type: { enum: METAFIELD_TYPES },
        isList: { type: 'boolean' },
        required: { type: 'boolean' },
        validations: {
          type: 'array',
          items: { $ref: '#/definitions/validation' }
        },
        subFields: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/definitions/field' }
        }
      },
      allOf: [
        {
          if: { properties: { type: { const: 'group' } }, required: ['type'] },
          then: { required: ['subFields'] },
          else: { not: { required: ['subFields'] } }
        }
      ]
    }
  },
  type: 'object',
  additionalProperties: false,
  required: ['ownerType', 'namespace', 'key', 'name', 'type'],
  properties: {
    ownerType: { type: 'string', minLength: 1, maxLength: 64 },
    namespace: { type: 'string', pattern: KEY_PATTERN, maxLength: 64 },
    key: { type: 'string', pattern: KEY_PATTERN, maxLength: 64 },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string' },
    type: { enum: METAFIELD_TYPES },
    isList: { type: 'boolean' },
    required: { type: 'boolean' },
    translatable: { type: 'boolean' },
    visibleToCustomer: { type: 'boolean' },
    validations: { type: 'array', items: { $ref: '#/definitions/validation' } },
    subFields: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/definitions/field' }
    },
    appearance: { type: 'object' }
  },
  allOf: [
    {
      if: { properties: { type: { const: 'group' } }, required: ['type'] },
      then: { required: ['subFields'] },
      else: { not: { required: ['subFields'] } }
    }
  ]
} as const;

const ajv = new Ajv({ strict: false, allErrors: true });
const validateEntrySchema = ajv.compile(ENTRY_SCHEMA as object);

export function refOf(d: {
  ownerType: string;
  namespace: string;
  key: string;
}): string {
  return `${d.ownerType}.${d.namespace}.${d.key}`;
}

/**
 * Strict validation of a theme.json `metafieldDefinitions[]` array.
 * `compileField` is NOT a manifest validator (unknown types compile to `{}`,
 * an empty group only dies at the DB CHECK), so structure is checked by a
 * strict schema first; compileField runs after as the depth-cap sanity check.
 *
 * Errors block activation; warnings are advisory (printed by the CLI /
 * carried in the provision result).
 */
export function validateManifestMetafieldDefinitions(entries: unknown): {
  errors: ManifestDefinitionIssue[];
  warnings: ManifestDefinitionIssue[];
} {
  const errors: ManifestDefinitionIssue[] = [];
  const warnings: ManifestDefinitionIssue[] = [];

  if (!Array.isArray(entries)) {
    errors.push({
      index: -1,
      message: 'metafieldDefinitions must be an array'
    });
    return { errors, warnings };
  }

  const seen = new Set<string>();
  entries.forEach((raw, index) => {
    if (!validateEntrySchema(raw)) {
      for (const err of validateEntrySchema.errors ?? []) {
        errors.push({
          index,
          message: `${err.instancePath || '(entry)'} ${
            err.message ?? 'is invalid'
          }`
        });
      }
      return;
    }
    const entry = raw as ManifestMetafieldDefinition;
    const ref = refOf(entry);

    if (seen.has(ref)) {
      errors.push({ index, message: `duplicate definition "${ref}"` });
      return;
    }
    seen.add(ref);

    // `required: true` is refused outright: validateMetafields throws on any
    // missing required field, so seeding one breaks every entity save
    // store-wide until values are backfilled.
    if (entry.required === true) {
      errors.push({
        index,
        message:
          `"${ref}": required metafields cannot be seeded by a theme — ` +
          `activating would make every ${entry.ownerType} save fail until ` +
          `values are backfilled`
      });
      return;
    }

    // Depth / group sanity via the lib compiler.
    try {
      compileField(
        {
          key: entry.key,
          name: entry.name,
          type: entry.type,
          isList: entry.isList,
          validations: entry.validations,
          subFields: entry.subFields
        },
        1,
        MAX_DEPTH
      );
    } catch (e) {
      errors.push({ index, message: `"${ref}": ${(e as Error).message}` });
      return;
    }

    if (entry.translatable === true) {
      warnings.push({
        index,
        message: `"${ref}": translatable is accepted but currently inert — no core code consumes it`
      });
    }
    if (!WIRED_METAFIELD_OWNERS.includes(entry.ownerType)) {
      warnings.push({
        index,
        message:
          `"${ref}": ownerType "${entry.ownerType}" has no metafield wiring in ` +
          `core — the definition will exist but nothing renders or edits it ` +
          `(an extension must wire the owner)`
      });
    }
    if (entry.namespace === 'custom') {
      warnings.push({
        index,
        message: `"${ref}": namespace "custom" is the merchant's hand-created space — declare theme fields in the theme's own namespace`
      });
    }
    for (const k of Object.keys(entry.appearance ?? {})) {
      if (k !== 'placeholder') {
        warnings.push({
          index,
          message: `"${ref}": unknown appearance key "${k}" (only "placeholder" has meaning)`
        });
      }
    }
  });

  return { errors, warnings };
}

/**
 * JSON.stringify with recursively sorted object keys — Postgres JSONB does
 * NOT preserve key order (keys come back sorted by length then bytewise), so
 * a naive stringify comparison of declared-vs-stored validations/subFields
 * reports false drift on every re-provision.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map(
        (k) =>
          `${JSON.stringify(k)}:${stableStringify(
            (value as Record<string, unknown>)[k]
          )}`
      )
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export type IncumbentClassification =
  | { kind: 'identical' }
  | { kind: 'mutable-drift'; fields: string[] }
  | { kind: 'immutable-conflict'; details: ProvisionConflictDetail[] };

/**
 * Compare a declared entry against the existing definition row under the same
 * (ownerType, namespace, key). Immutable mismatch (type / isList) can never
 * converge — `updateMetafieldDefinition` rejects those fields — so it's a
 * conflict; mutable differences are reported as drift and kept (no
 * auto-PATCH: silently tightening validations can break unrelated saves).
 */
export function classifyIncumbent(
  declared: ManifestMetafieldDefinition,
  incumbent: MetafieldDefinition
): IncumbentClassification {
  const details: ProvisionConflictDetail[] = [];
  if (declared.type !== incumbent.type) {
    details.push({
      field: 'type',
      declared: declared.type,
      incumbent: incumbent.type
    });
  }
  if ((declared.isList ?? false) !== (incumbent.isList ?? false)) {
    details.push({
      field: 'isList',
      declared: declared.isList ?? false,
      incumbent: incumbent.isList ?? false
    });
  }
  if (details.length > 0) {
    return { kind: 'immutable-conflict', details };
  }

  const drifted: string[] = [];
  const same = (a: unknown, b: unknown) =>
    stableStringify(a) === stableStringify(b);
  if (declared.name !== incumbent.name) drifted.push('name');
  // Declared `required` is always false (the validator refuses true), so this
  // surfaces a merchant PATCHing a provisioned definition to required.
  if ((declared.required ?? false) !== (incumbent.required ?? false))
    drifted.push('required');
  if ((declared.description ?? '') !== (incumbent.description ?? ''))
    drifted.push('description');
  if ((declared.translatable ?? false) !== (incumbent.translatable ?? false))
    drifted.push('translatable');
  if (
    (declared.visibleToCustomer ?? true) !==
    (incumbent.visibleToCustomer ?? true)
  )
    drifted.push('visibleToCustomer');
  if (!same(declared.validations ?? [], incumbent.validations ?? []))
    drifted.push('validations');
  if (!same(declared.subFields ?? [], incumbent.subFields ?? []))
    drifted.push('subFields');
  if (!same(declared.appearance ?? {}, incumbent.appearance ?? {}))
    drifted.push('appearance');

  return drifted.length > 0
    ? { kind: 'mutable-drift', fields: drifted }
    : { kind: 'identical' };
}

const KNOWN_VALIDATION_KEYS = ['type', 'min', 'max', 'pattern', 'values'];
const KNOWN_VALIDATION_TYPES = ['size', 'range', 'regexp', 'choices'];

function sanitizeValidations(raw: unknown): Validation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Validation[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const rec = v as Record<string, unknown>;
    if (!KNOWN_VALIDATION_TYPES.includes(rec.type as string)) continue;
    const picked: Record<string, unknown> = {};
    for (const k of KNOWN_VALIDATION_KEYS) {
      if (rec[k] !== undefined) picked[k] = rec[k];
    }
    out.push(picked as unknown as Validation);
  }
  return out.length > 0 ? out : undefined;
}

function sanitizeSubFields(raw: unknown): FieldDescriptor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: FieldDescriptor[] = [];
  for (const f of raw) {
    if (!f || typeof f !== 'object') continue;
    const rec = f as Record<string, unknown>;
    const sub: Record<string, unknown> = {
      key: rec.key,
      name: rec.name,
      type: rec.type
    };
    if (typeof rec.description === 'string') sub.description = rec.description;
    if (rec.isList === true) sub.isList = true;
    if (rec.required === true) sub.required = true;
    const validations = sanitizeValidations(rec.validations);
    if (validations) sub.validations = validations;
    const subFields = sanitizeSubFields(rec.subFields);
    if (subFields) sub.subFields = subFields;
    out.push(sub as unknown as FieldDescriptor);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Reduce a live definition (as mutated by the admin REST surface, whose
 * payload schemas accept unconstrained validations/subFields arrays) to the
 * strict manifest shape — `theme:export` must never write a manifest that its
 * own validation then rejects, blocking activation of the exported theme.
 * Returns null when the definition can't be expressed in the manifest schema.
 */
export function sanitizeForManifest(
  def: MetafieldDefinition
): ManifestMetafieldDefinition | null {
  const entry: Record<string, unknown> = {
    ownerType: def.ownerType,
    namespace: def.namespace,
    key: def.key,
    name: def.name,
    type: def.type
  };
  if (def.description) entry.description = def.description;
  if (def.isList) entry.isList = true;
  if (def.translatable) entry.translatable = true;
  if (def.visibleToCustomer === false) entry.visibleToCustomer = false;
  const validations = sanitizeValidations(def.validations);
  if (validations) entry.validations = validations;
  const subFields = sanitizeSubFields(def.subFields);
  if (subFields) entry.subFields = subFields;
  const appearance = def.appearance ?? {};
  if (typeof appearance.placeholder === 'string') {
    entry.appearance = { placeholder: appearance.placeholder };
  }
  const { errors } = validateManifestMetafieldDefinitions([entry]);
  return errors.length === 0
    ? (entry as unknown as ManifestMetafieldDefinition)
    : null;
}

/**
 * True when the `provisioned_by_theme` attribution column exists — false on
 * a DB that hasn't run this core version's migrations yet (theme CLI before
 * the server ever booted). Callers degrade gracefully instead of erroring.
 */
export async function provisioningAvailable(pool: Pool): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'metafield_definition'
        AND column_name = 'provisioned_by_theme'`
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Ensure a theme's declared metafield definitions exist — idempotent, always
 * safe to re-run. Runs at `theme:active` and at every server boot (after
 * migrations), in its OWN transaction — deliberately not inside the theme
 * installer's: three installer branches commit-and-return early (no-op,
 * rejected, fresh install) and the ensure must run regardless of the widget
 * SemVer outcome.
 *
 * Per declared entry:
 *   - missing → `INSERT … ON CONFLICT DO NOTHING RETURNING` (atomic; the
 *     check-then-insert `createMetafieldDefinition` service is racy), stamped
 *     `provisioned_by_theme`, + a `metafield_definition_created` event on the
 *     same connection.
 *   - present, immutables match → adopt; claim attribution only when the row
 *     is unowned (`provisioned_by_theme IS NULL`) — first seeder wins.
 *     Mutable drift is warned and kept.
 *   - present, immutables differ → conflict; reported, never applied, never
 *     claimed.
 * "Retired" (attributed to this theme but no longer declared) is a READ-TIME
 * REPORT — no stored state, nothing to flip; the definitions stay in place.
 */
export async function provisionThemeMetafields(
  themeId: string,
  entries: ManifestMetafieldDefinition[],
  pool: Pool
): Promise<ProvisionResult> {
  const result: ProvisionResult = {
    seeded: [],
    adopted: [],
    retired: [],
    conflicts: [],
    warnings: [],
    errors: [],
    skipped: false
  };

  const { errors, warnings } = validateManifestMetafieldDefinitions(entries);
  result.warnings.push(...warnings);
  result.errors.push(...errors);
  const invalidIndexes = new Set(errors.map((e) => e.index));
  const valid = entries.filter((_, i) => !invalidIndexes.has(i));

  // Retirement reporting must key on what the manifest DECLARES, not what
  // validated: a temporarily-invalid entry (typo'd validation) still counts
  // as declared.
  const declaredRefs = new Set<string>();
  for (const raw of entries) {
    const e = raw as Partial<ManifestMetafieldDefinition> | null;
    if (
      e &&
      typeof e.ownerType === 'string' &&
      typeof e.namespace === 'string' &&
      typeof e.key === 'string'
    ) {
      declaredRefs.add(refOf(e as ManifestMetafieldDefinition));
    }
  }

  if (!(await provisioningAvailable(pool))) {
    result.skipped = true;
    result.warnings.push({
      index: -1,
      message:
        'metafield attribution column not found (database not migrated yet) — ' +
        'definitions will be provisioned at the next server start'
    });
    return result;
  }

  const conn = await pool.connect();
  try {
    await startTransaction(conn);
    for (const entry of valid) {
      const ref = refOf(entry);

      const inserted = await conn.query(
        `INSERT INTO "metafield_definition"
           ("owner_type", "namespace", "field_key", "name", "description",
            "field_type", "is_list", "required", "translatable",
            "visible_to_customer", "sub_fields", "validations", "appearance",
            "provisioned_by_theme")
         VALUES ($1, $2, $3, $4, $5, $6::metafield_type, $7, FALSE, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13)
         ON CONFLICT ("owner_type", "namespace", "field_key") DO NOTHING
         RETURNING *`,
        [
          entry.ownerType,
          entry.namespace,
          entry.key,
          entry.name,
          entry.description ?? null,
          entry.type,
          entry.isList ?? false,
          entry.translatable ?? false,
          entry.visibleToCustomer ?? true,
          JSON.stringify(entry.subFields ?? []),
          JSON.stringify(entry.validations ?? []),
          JSON.stringify(entry.appearance ?? {}),
          themeId
        ]
      );

      if (inserted.rows.length > 0) {
        result.seeded.push(ref);
        await emit(
          'metafield_definition_created',
          rowToDefinition(inserted.rows[0]) as any,
          conn
        );
        continue;
      }

      const incumbentRes = await conn.query(
        `SELECT * FROM "metafield_definition"
          WHERE owner_type = $1 AND namespace = $2 AND field_key = $3`,
        [entry.ownerType, entry.namespace, entry.key]
      );
      if (incumbentRes.rows.length === 0) {
        // Deleted between the INSERT and the SELECT — vanishingly rare;
        // report and let the next run seed it.
        result.errors.push({
          index: -1,
          message: `"${ref}": definition vanished mid-provision; re-run to seed`
        });
        continue;
      }
      const incumbent = rowToDefinition(incumbentRes.rows[0]);
      const classification = classifyIncumbent(entry, incumbent);
      if (classification.kind === 'immutable-conflict') {
        result.conflicts.push({ ref, details: classification.details });
        continue;
      }
      if (classification.kind === 'mutable-drift') {
        result.warnings.push({
          index: -1,
          message:
            `"${ref}": exists with different ${classification.fields.join(
              ', '
            )} — ` + `kept as-is (edit via the admin to converge)`
        });
      }
      result.adopted.push(ref);
      // Claim attribution only when unowned — first seeder wins; a
      // merchant-created or another theme's definition keeps its owner.
      await conn.query(
        `UPDATE "metafield_definition"
            SET provisioned_by_theme = $4
          WHERE owner_type = $1 AND namespace = $2 AND field_key = $3
            AND provisioned_by_theme IS NULL`,
        [entry.ownerType, entry.namespace, entry.key, themeId]
      );
    }

    // Report-only: attributed to this theme, no longer declared.
    const owned = await conn.query<{
      owner_type: string;
      namespace: string;
      field_key: string;
    }>(
      `SELECT owner_type, namespace, field_key FROM "metafield_definition"
        WHERE provisioned_by_theme = $1`,
      [themeId]
    );
    for (const row of owned.rows) {
      const ref = `${row.owner_type}.${row.namespace}.${row.field_key}`;
      if (!declaredRefs.has(ref)) result.retired.push(ref);
    }

    await commit(conn);
  } catch (e) {
    await rollback(conn);
    throw e;
  }
  return result;
}
