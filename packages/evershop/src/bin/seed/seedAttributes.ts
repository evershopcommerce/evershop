import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { insert, select } from '@evershop/postgres-query-builder';
import { info, success, error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import createProductAttribute from '../../modules/catalog/services/attribute/createProductAttribute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create or get the demo attribute group
 */
export async function seedAttributeGroup(): Promise<number> {
  info('Creating demo attribute group...');

  // Check if demo group already exists
  const existingGroup = await select()
    .from('attribute_group')
    .where('group_name', '=', 'Demo Products')
    .load(pool);

  if (existingGroup) {
    info('Demo attribute group already exists, reusing...');
    return existingGroup.attribute_group_id;
  }

  // Create the demo attribute group
  const result = await insert('attribute_group')
    .given({
      group_name: 'Demo Products'
    })
    .execute(pool);

  success(`✓ Created attribute group: Demo Products (ID: ${result.insertId})`);
  return result.insertId;
}

/**
 * Seed product attributes from JSON file
 */
export async function seedAttributes(
  demoAttributeGroupId: number
): Promise<void> {
  info('Seeding attributes...');
  const dataPath = path.join(__dirname, 'data', 'attributes.json');
  const attributesData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const attributeData of attributesData) {
    try {
      // Check if attribute already exists
      const existingAttribute = await select()
        .from('attribute')
        .where('attribute_code', '=', attributeData.attribute_code)
        .load(pool);

      if (existingAttribute) {
        info(
          `Attribute "${attributeData.attribute_name}" already exists, updating options...`
        );

        // If attribute has options (select/multiselect type), sync the options
        if (attributeData.options && Array.isArray(attributeData.options)) {
          for (const optionData of attributeData.options) {
            // Check if option already exists
            const existingOption = await select()
              .from('attribute_option')
              .where('attribute_id', '=', existingAttribute.attribute_id)
              .and('option_text', '=', optionData.option_text)
              .load(pool);

            if (!existingOption) {
              // Add new option - must include attribute_code
              await insert('attribute_option')
                .given({
                  attribute_id: existingAttribute.attribute_id,
                  attribute_code: existingAttribute.attribute_code,
                  option_text: optionData.option_text
                })
                .execute(pool);
              success(`  ✓ Added option: ${optionData.option_text}`);
            } else {
              info(`  → Option "${optionData.option_text}" already exists`);
            }
          }
        }

        // Ensure attribute is linked to demo group
        const existingLink = await select()
          .from('attribute_group_link')
          .where('attribute_id', '=', existingAttribute.attribute_id)
          .and('group_id', '=', demoAttributeGroupId)
          .load(pool);

        if (!existingLink) {
          await insert('attribute_group_link')
            .given({
              attribute_id: existingAttribute.attribute_id,
              group_id: demoAttributeGroupId
            })
            .execute(pool);
          info(`  → Linked to Demo Products group`);
        }

        continue;
      }

      // Add the demo group if no groups specified
      if (!attributeData.groups || attributeData.groups.length === 0) {
        attributeData.groups = [demoAttributeGroupId];
      }

      await createProductAttribute(attributeData, {});
      success(`✓ Created attribute: ${attributeData.attribute_name}`);
    } catch (e: any) {
      error(
        `Failed to create attribute ${attributeData.attribute_name}: ${e.message}`
      );
    }
  }
}
