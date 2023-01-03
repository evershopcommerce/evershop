const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `ALTER TABLE attribute ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER attribute_id`);
  await execute(pool, `UPDATE attribute SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE attribute MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE attribute ADD UNIQUE KEY \`ATTRIBUTE_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE attribute_option ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER attribute_option_id`);
  await execute(pool, `UPDATE attribute_option SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE attribute_option MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE attribute_option ADD UNIQUE KEY \`ATTRIBUTE_OPTION_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE attribute_group ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER attribute_group_id`);
  await execute(pool, `UPDATE attribute_group SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE attribute_group MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE attribute_group ADD UNIQUE KEY \`ATTRIBUTE_GROUP_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE attribute_group_link ADD KEY \`FK_ATTRIBUTE_LINK\` (\`attribute_id\`)`);

  await execute(pool, `ALTER TABLE variant_group ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER variant_group_id`);
  await execute(pool, `UPDATE variant_group SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE variant_group MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE variant_group ADD UNIQUE KEY \`VARIANT_GROUP_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE customer_group MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE customer_group ADD UNIQUE KEY \`CUSTOMER_GROUP_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE product MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `UPDATE product SET uuid = replace(uuid(),'-','')`);
  await execute(pool, `ALTER TABLE product ADD UNIQUE KEY \`PRODUCT_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE product_attribute_value_index ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER product_attribute_value_index_id`);
  await execute(pool, `UPDATE product_attribute_value_index SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE product_attribute_value_index MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE product_attribute_value_index ADD UNIQUE KEY \`PRODUCT_ATTRIBUTE_VALUE_UUID\` (\`uuid\`)`);
  await execute(pool, `ALTER TABLE product_attribute_value_index ADD KEY \`FK_PRODUCT_ATTRIBUTE_LINK\` (\`product_id\`)`);

  await execute(pool, `ALTER TABLE product_custom_option ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER product_custom_option_id`);
  await execute(pool, `UPDATE product_custom_option SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE product_custom_option MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE product_custom_option ADD UNIQUE KEY \`PRODUCT_CUSTOM_OPTION_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE product_custom_option_value ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER product_custom_option_value_id`);
  await execute(pool, `UPDATE product_custom_option_value SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE product_custom_option_value MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE product_custom_option_value ADD UNIQUE KEY \`PRODUCT_CUSTOM_OPTION_VALUE_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE product_image ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER product_image_id`);
  await execute(pool, `UPDATE product_image SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE product_image MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE product_image ADD UNIQUE KEY \`PRODUCT_IMAGE_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE product_price ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER product_price_id`);
  await execute(pool, `UPDATE product_price SET uuid = replace(uuid(),'-','') WHERE uuid = ''`);
  await execute(pool, `ALTER TABLE product_price MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE product_price ADD UNIQUE KEY \`PRODUCT_PRICE_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE category MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))`);
  await execute(pool, `ALTER TABLE category ADD UNIQUE KEY \`CATEGORY_UUID\` (\`uuid\`)`);

  await execute(pool, `ALTER TABLE product_category ADD KEY \`FK_CATEGORY_PRODUCT_LINK\` (\`category_id\`)`);
};
