import { insert, select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { info, success, error, warning } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';

/** `variant_group` has exactly five axis columns. */
const MAX_AXES = 5;
const AXIS_COLUMNS = [
  'attribute_one',
  'attribute_two',
  'attribute_three',
  'attribute_four',
  'attribute_five'
] as const;

export interface SeedAttribute {
  attributeId: number;
  code: string;
  sortOrder: number;
  /** The seed data marked it `is_variant`, so it MAY be a variant axis. */
  isVariant: boolean;
}

/** Every attribute the seed data defines, by code, with what the DB gave it. */
export async function loadSeedAttributes(
  attributesData: any[]
): Promise<Map<string, SeedAttribute>> {
  const out = new Map<string, SeedAttribute>();
  for (const a of attributesData) {
    const row = await select()
      .from('attribute')
      .where('attribute_code', '=', a.attribute_code)
      .load(pool);
    if (!row) {
      continue;
    }
    out.set(a.attribute_code, {
      attributeId: (row as any).attribute_id,
      code: a.attribute_code,
      sortOrder: Number(a.sort_order ?? (row as any).sort_order ?? 0),
      isVariant: a.is_variant === true || a.is_variant === 1
    });
  }
  return out;
}

const valueOf = (product: any, code: string): string | undefined =>
  (product.attributes || []).find((a: any) => a.attribute_code === code)?.value;

/**
 * The axes a variant group actually needs.
 *
 * An attribute becomes an axis when the seed data marks it `is_variant` AND the
 * group's members genuinely differ on it. Declaring intent alone is not enough:
 * a fashion set marks both colour and size, but a shirt that only comes in
 * white still varies on size only, and an axis nothing varies on gives the
 * storefront a picker with one choice.
 *
 * Order follows the attribute's own `sort_order`, so `attribute_one` is stable
 * across runs instead of depending on object key order.
 */
export function axesFor(
  members: any[],
  attributes: Map<string, SeedAttribute>,
  groupName: string
): SeedAttribute[] {
  const candidates = [...attributes.values()]
    .filter((a) => a.isVariant)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));

  const axes: SeedAttribute[] = [];
  for (const attribute of candidates) {
    const values = members.map((m) => valueOf(m, attribute.code));
    if (values.some((v) => v === undefined)) {
      // A half-declared axis would make the picker unusable for the members
      // that lack a value, so it is reported rather than silently dropped.
      if (values.some((v) => v !== undefined)) {
        warning(
          `  ⚠️  Variant group "${groupName}": not every member declares "${attribute.code}", skipping it as an axis`
        );
      }
      continue;
    }
    if (new Set(values).size > 1) {
      axes.push(attribute);
    }
  }

  if (axes.length > MAX_AXES) {
    warning(
      `  ⚠️  Variant group "${groupName}" varies on ${axes.length} attributes; a variant group holds ${MAX_AXES}. Using ${axes
        .slice(0, MAX_AXES)
        .map((a) => a.code)
        .join(', ')}.`
    );
    return axes.slice(0, MAX_AXES);
  }
  return axes;
}

/**
 * The id of the variant group the seed data's `groupName` already owns, or null.
 *
 * `variant_group` carries no name of its own — the group name lives only in the
 * seed file — so an existing group is found through its members: if any SKU
 * declared in that group is already in the database with a `variant_group_id`,
 * that is the group. Without this, every re-seed inserted a fresh row for each
 * group name while the products themselves were skipped, leaving orphaned
 * groups behind on every run.
 */
async function findExistingGroup(
  productsData: any[],
  groupName: string
): Promise<number | null> {
  const skus = productsData
    .filter((p) => p.variant_group === groupName && p.sku)
    .map((p) => p.sku);
  for (const sku of skus) {
    const product = await select('variant_group_id')
      .from('product')
      .where('sku', '=', sku)
      .load(pool);
    const id = (product as any)?.variant_group_id;
    if (id) {
      return Number(id);
    }
  }
  return null;
}

/**
 * Create the variant groups the product data asks for, reusing any that exist.
 *
 * Which attributes drive a group is decided by the seed data, not by this file:
 * mark an attribute `is_variant` in `attributes.json` and it becomes eligible.
 * Colour used to be hardcoded as the only axis, which made size unusable as a
 * variant for a fashion catalogue and left every other industry with no way to
 * express its own.
 */
export async function createVariantGroups(
  productsData: any[],
  demoAttributeGroupId: number,
  attributes: Map<string, SeedAttribute>
): Promise<Map<string, number>> {
  const variantGroupIds = new Map<string, number>();

  const groups = new Map<string, any[]>();
  for (const productData of productsData) {
    if (productData.variant_group) {
      const members = groups.get(productData.variant_group) ?? [];
      members.push(productData);
      groups.set(productData.variant_group, members);
    }
  }
  if (groups.size === 0) {
    return variantGroupIds;
  }

  info('Creating variant groups...');
  for (const [groupName, members] of groups) {
    try {
      const existingId = await findExistingGroup(productsData, groupName);
      if (existingId) {
        variantGroupIds.set(groupName, existingId);
        info(
          `Variant group "${groupName}" already exists (ID: ${existingId}), reusing...`
        );
        continue;
      }

      const axes = axesFor(members, attributes, groupName);
      if (axes.length === 0) {
        warning(
          `  ⚠️  Variant group "${groupName}" has ${members.length} member(s) that vary on no variant attribute. Created without an axis; the storefront will show no picker.`
        );
      }

      const data: Record<string, unknown> = {
        uuid: uuidv4(),
        attribute_group_id: demoAttributeGroupId,
        visibility: 1
      };
      AXIS_COLUMNS.forEach((column, i) => {
        data[column] = axes[i] ? axes[i].attributeId : null;
      });

      const result = await insert('variant_group').given(data).execute(pool);
      variantGroupIds.set(groupName, result.insertId);
      success(
        `✓ Created variant group: ${groupName} (ID: ${result.insertId}, axes: ${
          axes.map((a) => a.code).join(', ') || 'none'
        })`
      );
    } catch (e: any) {
      error(`Failed to create variant group ${groupName}: ${e.message}`);
    }
  }

  return variantGroupIds;
}

/**
 * Resolve attribute values from text to option IDs for select type attributes
 */
export async function resolveAttributeOptions(
  attributes: any[]
): Promise<any[]> {
  const validAttributes: any[] = [];

  for (const attr of attributes) {
    const attribute = await select()
      .from('attribute')
      .where('attribute_code', '=', attr.attribute_code)
      .load(pool);

    if (
      attribute &&
      (attribute.type === 'select' || attribute.type === 'multiselect')
    ) {
      const option = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute.attribute_id)
        .and('option_text', '=', attr.value)
        .load(pool);

      if (option) {
        attr.value = option.attribute_option_id.toString();
        validAttributes.push(attr);
        info(
          `  → Resolved ${attr.attribute_code}: "${option.option_text}" → ID ${option.attribute_option_id}`
        );
      } else {
        error(
          `  ✗ Option "${attr.value}" not found for attribute "${attr.attribute_code}" - skipping this attribute`
        );
      }
    } else {
      validAttributes.push(attr);
    }
  }

  return validAttributes;
}
