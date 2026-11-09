import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import type {
  AttributeRow,
  VariantGroupRow
} from '../../../../types/db/index.js';
import { VariantGroupError } from './VariantGroupError.js';

export interface CreateVariantGroupInput {
  /** The attribute group the products of the variant group belong to. */
  attribute_group_id: number | string;
  /** The axes: 1 to 5 codes of attributes of type `select`. */
  attribute_codes: string[];
}

export interface CreatedVariantGroup {
  group: VariantGroupRow;
  /**
   * The axes, in the order they are stored (`attribute_one` first). That is the
   * order the attribute table answers in, not the order of `attribute_codes`.
   */
  attributes: AttributeRow[];
}

const AXIS_COLUMNS = [
  'attribute_one',
  'attribute_two',
  'attribute_three',
  'attribute_four',
  'attribute_five'
] as const;

/**
 * Creates a variant group: a row that says which attributes the products of the
 * group differ by. Products join it with `addVariantItem`.
 *
 * Refuses (with a `VariantGroupError`) no attributes, more than 5, an attribute
 * that does not exist or is not of type `select`, and an attribute that is not
 * linked to the attribute group.
 */
export default async function createVariantGroup(
  input: CreateVariantGroupInput
): Promise<CreatedVariantGroup> {
  const { attribute_codes, attribute_group_id } = input;
  if (attribute_codes.length === 0) {
    throw new VariantGroupError('NO_ATTRIBUTES', 'No attributes provided');
  }
  if (attribute_codes.length > AXIS_COLUMNS.length) {
    throw new VariantGroupError(
      'TOO_MANY_ATTRIBUTES',
      'We only support up to 5 attributes'
    );
  }

  const attributes = (await select()
    .from('attribute')
    .where('attribute_code', 'in', attribute_codes)
    .and('type', '=', 'select')
    .execute(pool)) as AttributeRow[];
  if (attributes.length !== attribute_codes.length) {
    throw new VariantGroupError(
      'ATTRIBUTE_NOT_SELECT',
      'Attribute must be of type select'
    );
  }

  const attributeGroupLinks = await select()
    .from('attribute_group_link')
    .where('group_id', '=', attribute_group_id)
    .and(
      'attribute_id',
      'in',
      attributes.map((a) => a.attribute_id)
    )
    .execute(pool);
  if (attributeGroupLinks.length !== attributes.length) {
    throw new VariantGroupError(
      'ATTRIBUTE_NOT_IN_GROUP',
      'Attribute must be assigned to the group'
    );
  }

  const data: Record<string, unknown> = {};
  attributes.forEach((attribute, index) => {
    data[AXIS_COLUMNS[index]] = attribute.attribute_id;
  });
  data.attribute_group_id = attribute_group_id;
  const result = await insert('variant_group').given(data).execute(pool);

  const group = (await select()
    .from('variant_group')
    .where('variant_group_id', '=', result.insertId)
    .load(pool)) as VariantGroupRow;

  return { group, attributes };
}
