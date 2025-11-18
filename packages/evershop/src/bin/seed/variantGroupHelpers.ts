import { insert, select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { info, success, error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';

/**
 * Create variant groups for products
 */
export async function createVariantGroups(
  productsData: any[],
  demoAttributeGroupId: number,
  colorAttributeId: number
): Promise<Map<string, number>> {
  const variantGroupIds = new Map<string, number>();

  // Collect unique variant group names
  const uniqueGroups = new Set<string>();
  for (const productData of productsData) {
    if (productData.variant_group) {
      uniqueGroups.add(productData.variant_group);
    }
  }

  // Create variant group records
  info('Creating variant groups...');
  for (const groupName of uniqueGroups) {
    try {
      // Generate a proper UUID compatible with PostgreSQL
      const uuid = uuidv4();

      // Create the variant group with attribute IDs and attribute_group_id
      const result = await insert('variant_group')
        .given({
          uuid: uuid,
          attribute_group_id: demoAttributeGroupId,
          attribute_one: colorAttributeId,
          attribute_two: null,
          attribute_three: null,
          attribute_four: null,
          attribute_five: null,
          visibility: 1
        })
        .execute(pool);

      variantGroupIds.set(groupName, result.insertId);
      success(
        `✓ Created variant group: ${groupName} (ID: ${result.insertId}, UUID: ${uuid})`
      );
    } catch (e: any) {
      error(`Failed to create variant group ${groupName}: ${e.message}`);
    }
  }

  return variantGroupIds;
}

/**
 * Resolve attribute option IDs from text values
 */
export async function resolveAttributeOptions(
  attributes: any[]
): Promise<any[]> {
  const validAttributes: any[] = [];

  for (const attr of attributes) {
    // Check the attribute type
    const attribute = await select()
      .from('attribute')
      .where('attribute_code', '=', attr.attribute_code)
      .load(pool);

    if (
      attribute &&
      (attribute.type === 'select' || attribute.type === 'multiselect')
    ) {
      // Look up the option ID by option text
      const option = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute.attribute_id)
        .and('option_text', '=', attr.value)
        .load(pool);

      if (option) {
        // Replace the text value with the option ID
        attr.value = option.attribute_option_id.toString();
        validAttributes.push(attr);
        info(
          `  → Resolved ${attr.attribute_code}: "${option.option_text}" → ID ${option.attribute_option_id}`
        );
      } else {
        error(
          `  ✗ Option "${attr.value}" not found for attribute "${attr.attribute_code}" - skipping this attribute`
        );
        // Don't add this attribute to validAttributes
      }
    } else {
      // Non-select attributes, add as-is
      validAttributes.push(attr);
    }
  }

  return validAttributes;
}
