import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../event/emitter.js';
import { pool } from '../postgres/connection.js';
import { del, insert, select, update } from '../postgres/query.js';
import { getActiveTheme } from '../util/getActiveTheme.js';
import { compileField } from './compileField.js';
import { MAX_DEPTH } from './types.js';
import type {
  FieldDescriptor,
  MetafieldDefinition,
  MetafieldType,
  Validation
} from './types.js';

const IMMUTABLE_FIELDS = [
  'ownerType',
  'namespace',
  'key',
  'type',
  'isList'
] as const;

export interface CreateDefinitionInput {
  ownerType: string;
  namespace?: string;
  key: string;
  name: string;
  description?: string;
  type: MetafieldType;
  isList?: boolean;
  required?: boolean;
  translatable?: boolean;
  visibleToCustomer?: boolean;
  validations?: Validation[];
  appearance?: Record<string, unknown>;
  subFields?: FieldDescriptor[];
  position?: number;
  /** Theme attribution (drawer lazy-create / programmatic seeding). The
   *  `.given()` write drops the column silently on unmigrated DBs. */
  provisionedByTheme?: string;
}

export type UpdateDefinitionInput = Partial<CreateDefinitionInput>;

function httpError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

/** Map a DB row (snake_case columns) to the API-facing definition shape. */
export function rowToDefinition(row: Record<string, any>): MetafieldDefinition {
  return {
    uuid: row.uuid,
    ownerType: row.owner_type,
    namespace: row.namespace,
    key: row.field_key,
    name: row.name,
    description: row.description ?? undefined,
    type: row.field_type,
    isList: row.is_list,
    required: row.required,
    translatable: row.translatable,
    visibleToCustomer: row.visible_to_customer,
    validations: row.validations ?? [],
    appearance: row.appearance ?? {},
    subFields: row.sub_fields ?? [],
    position: row.position,
    provisionedByTheme: row.provisioned_by_theme ?? undefined
  };
}

/** Reject invalid descriptors (depth > 3, malformed groups) before persisting. */
function assertCompilable(input: {
  key: string;
  type: MetafieldType;
  isList?: boolean;
  validations?: Validation[];
  subFields?: FieldDescriptor[];
}): void {
  try {
    compileField(
      {
        key: input.key,
        name: input.key,
        type: input.type,
        isList: input.isList,
        validations: input.validations,
        subFields: input.subFields
      },
      1,
      MAX_DEPTH
    );
  } catch (e) {
    throw httpError((e as Error).message, (e as any).status ?? 400);
  }
}

export async function listMetafieldDefinitions(
  ownerType: string
): Promise<MetafieldDefinition[]> {
  // Stable order: `position` first, then the serial PK as a deterministic
  // tie-breaker. `position` defaults to 0 for every definition, and the query
  // builder's ORDER BY is single-column — so without the PK tie-break the DB
  // returns ties in an arbitrary order that reshuffles whenever a row is
  // updated. Raw SQL lets us sort on both columns and keep the list stable.
  const res = await pool.query(
    `SELECT * FROM "metafield_definition"
      WHERE owner_type = $1
      ORDER BY position ASC, metafield_definition_id ASC`,
    [ownerType]
  );
  return res.rows.map(rowToDefinition);
}

export async function getMetafieldDefinition(
  uuid: string
): Promise<MetafieldDefinition | null> {
  const row = await select()
    .from('metafield_definition')
    .where('uuid', '=', uuid)
    .load(pool);
  return row ? rowToDefinition(row) : null;
}

export async function createMetafieldDefinition(
  input: CreateDefinitionInput
): Promise<MetafieldDefinition> {
  const namespace = input.namespace ?? 'custom';
  if (!input.ownerType || !input.key || !input.name || !input.type) {
    throw httpError('ownerType, key, name and type are required', 400);
  }
  assertCompilable(input);

  // Existence check — a definition with the same key may not already exist.
  const existing = await select()
    .from('metafield_definition')
    .where('owner_type', '=', input.ownerType)
    .and('namespace', '=', namespace)
    .and('field_key', '=', input.key)
    .load(pool);
  if (existing) {
    throw httpError(
      `A metafield definition "${namespace}.${input.key}" already exists for "${input.ownerType}"`,
      409
    );
  }

  const row = await insert('metafield_definition')
    .given({
      owner_type: input.ownerType,
      namespace,
      field_key: input.key,
      name: input.name,
      description: input.description ?? null,
      field_type: input.type,
      is_list: input.isList ?? false,
      required: input.required ?? false,
      translatable: input.translatable ?? false,
      visible_to_customer: input.visibleToCustomer ?? true,
      sub_fields: input.subFields ?? [],
      validations: input.validations ?? [],
      appearance: input.appearance ?? {},
      position: input.position ?? 0,
      provisioned_by_theme: input.provisionedByTheme ?? null
    })
    .execute(pool);

  const definition = rowToDefinition(row);
  await emit('metafield_definition_created', definition as any);
  return definition;
}

export async function updateMetafieldDefinition(
  uuid: string,
  patch: UpdateDefinitionInput
): Promise<MetafieldDefinition> {
  const current = await getMetafieldDefinition(uuid);
  if (!current) {
    throw httpError(`Metafield definition "${uuid}" not found`, 404);
  }

  // Immutable after creation: owner_type / namespace / field_key / field_type / is_list.
  for (const field of IMMUTABLE_FIELDS) {
    const next = (patch as any)[field];
    if (next !== undefined && next !== (current as any)[field]) {
      throw httpError(`"${field}" cannot be changed after creation`, 400);
    }
  }

  // Re-validate the descriptor when validation-affecting fields change.
  assertCompilable({
    key: current.key,
    type: current.type,
    isList: current.isList,
    validations: patch.validations ?? current.validations,
    subFields: patch.subFields ?? current.subFields
  });

  const data: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.required !== undefined) data.required = patch.required;
  if (patch.translatable !== undefined) data.translatable = patch.translatable;
  if (patch.visibleToCustomer !== undefined)
    data.visible_to_customer = patch.visibleToCustomer;
  if (patch.validations !== undefined) data.validations = patch.validations;
  if (patch.appearance !== undefined) data.appearance = patch.appearance;
  if (patch.subFields !== undefined) data.sub_fields = patch.subFields;
  if (patch.position !== undefined) data.position = patch.position;

  await update('metafield_definition')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(pool);

  const definition = (await getMetafieldDefinition(
    uuid
  )) as MetafieldDefinition;
  await emit('metafield_definition_updated', definition as any);
  return definition;
}

export async function deleteMetafieldDefinition(
  uuid: string,
  opts: { force?: boolean } = {}
): Promise<void> {
  const current = await getMetafieldDefinition(uuid);
  if (!current) {
    throw httpError(`Metafield definition "${uuid}" not found`, 404);
  }

  // Attribution guard: a definition provisioned by the active or an
  // installed theme is protected — deleting it fires the WHERE-less prune
  // fan-out and the theme would just re-seed it empty at the next boot.
  // `force` overrides. Pre-migration rows simply lack the column, so
  // provisionedByTheme is undefined and the guard self-disables.
  if (!opts.force && current.provisionedByTheme) {
    let protectedByTheme = current.provisionedByTheme === getActiveTheme();
    if (!protectedByTheme) {
      const reg = await pool.query(
        `SELECT to_regclass('public.theme_install_state') AS t`
      );
      if (reg.rows[0]?.t) {
        const installed = await pool.query(
          `SELECT 1 FROM "theme_install_state" WHERE theme = $1`,
          [current.provisionedByTheme]
        );
        protectedByTheme = installed.rows.length > 0;
      }
    }
    if (protectedByTheme) {
      throw httpError(
        `"${current.namespace}.${current.key}" is provisioned by theme ` +
          `"${current.provisionedByTheme}" — deleting it would drop stored ` +
          `values store-wide and the theme will re-seed it. Pass force to delete anyway.`,
        409
      );
    }
  }

  // One transaction for the delete and the prune-triggering event — a crash
  // between them must not skip the prune fan-out. Attribution lives on the
  // row itself, so there is no separate cleanup.
  const conn = await pool.connect();
  try {
    await startTransaction(conn);
    await del('metafield_definition').where('uuid', '=', uuid).execute(conn);
    // Cascade value cleanup: each owning module's prune subscriber strips
    // this key from every row of its table's meta_data.
    await emit(
      'metafield_definition_deleted',
      {
        ownerType: current.ownerType,
        namespace: current.namespace,
        fieldKey: current.key
      },
      conn
    );
    await commit(conn);
  } catch (e) {
    await rollback(conn);
    throw e;
  }
}
