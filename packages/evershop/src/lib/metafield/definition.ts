import { emit } from '../event/emitter.js';
import { pool } from '../postgres/connection.js';
import { del, insert, select, update } from '../postgres/query.js';
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
  referenceType?: string;
  validations?: Validation[];
  appearance?: Record<string, unknown>;
  subFields?: FieldDescriptor[];
  position?: number;
}

export type UpdateDefinitionInput = Partial<CreateDefinitionInput>;

function httpError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

/** Map a DB row (snake_case columns) to the API-facing definition shape. */
function rowToDefinition(row: Record<string, any>): MetafieldDefinition {
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
    referenceType: row.reference_type ?? undefined,
    validations: row.validations ?? [],
    appearance: row.appearance ?? {},
    subFields: row.sub_fields ?? [],
    position: row.position
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
  if (input.type === 'reference' && !input.referenceType) {
    throw httpError('referenceType is required when type is "reference"', 400);
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
      reference_type: input.referenceType ?? null,
      is_list: input.isList ?? false,
      required: input.required ?? false,
      translatable: input.translatable ?? false,
      visible_to_customer: input.visibleToCustomer ?? true,
      sub_fields: input.subFields ?? [],
      validations: input.validations ?? [],
      appearance: input.appearance ?? {},
      position: input.position ?? 0
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
  if (patch.referenceType !== undefined)
    data.reference_type = patch.referenceType;
  if (patch.validations !== undefined) data.validations = patch.validations;
  if (patch.appearance !== undefined) data.appearance = patch.appearance;
  if (patch.subFields !== undefined) data.sub_fields = patch.subFields;
  if (patch.position !== undefined) data.position = patch.position;

  await update('metafield_definition')
    .given(data)
    .where('uuid', '=', uuid)
    .execute(pool);

  const definition = (await getMetafieldDefinition(uuid)) as MetafieldDefinition;
  await emit('metafield_definition_updated', definition as any);
  return definition;
}

export async function deleteMetafieldDefinition(uuid: string): Promise<void> {
  const current = await getMetafieldDefinition(uuid);
  if (!current) {
    throw httpError(`Metafield definition "${uuid}" not found`, 404);
  }
  await del('metafield_definition').where('uuid', '=', uuid).execute(pool);
  // Cascade value cleanup: each owning module's prune subscriber strips this
  // key from every row of its table's meta_data.
  await emit('metafield_definition_deleted', {
    ownerType: current.ownerType,
    namespace: current.namespace,
    fieldKey: current.key
  });
}
