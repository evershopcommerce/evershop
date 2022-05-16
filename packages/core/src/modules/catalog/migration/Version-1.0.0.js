const { execute, insert } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `CREATE TABLE \`attribute\` (
  \`attribute_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`attribute_code\` varchar(255) NOT NULL,
  \`attribute_name\` varchar(255) NOT NULL,
  \`type\` varchar(11) NOT NULL,
  \`is_required\` smallint(5) unsigned NOT NULL DEFAULT 0,
  \`display_on_frontend\` smallint(5) unsigned NOT NULL DEFAULT 0,
  \`sort_order\` int(10) unsigned NOT NULL DEFAULT 0,
  \`is_filterable\` smallint(2) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (\`attribute_id\`),
  UNIQUE KEY \`UNIQUE_ATTRIBUTE_CODE\` (\`attribute_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product attribute'`);

  const color = await insert('attribute').given({
    attribute_code: 'color',
    attribute_name: 'Color',
    type: 'select',
    is_required: 0,
    display_on_frontend: 1,
    is_filterable: 1
  }).execute(pool);

  const size = await insert('attribute').given({
    attribute_code: 'size',
    attribute_name: 'Size',
    type: 'select',
    is_required: 0,
    display_on_frontend: 1,
    is_filterable: 1
  }).execute(pool);

  await execute(pool, `CREATE TABLE \`attribute_option\` (
  \`attribute_option_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`attribute_id\` int(10) unsigned NOT NULL,
  \`attribute_code\` varchar(255) NOT NULL,
  \`option_text\` varchar(255) NOT NULL,
  PRIMARY KEY (\`attribute_option_id\`),
  KEY \`FK_ATTRIBUTE_OPTION\` (\`attribute_id\`),
  CONSTRAINT \`FK_ATTRIBUTE_OPTION\` FOREIGN KEY (\`attribute_id\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product attribute option';
`);

  await insert('attribute_option').given({
    attribute_id: color.insertId,
    attribute_code: 'color',
    option_text: 'White'
  }).execute(pool);

  await insert('attribute_option').given({
    attribute_id: color.insertId,
    attribute_code: 'color',
    option_text: 'Black'
  }).execute(pool);

  await insert('attribute_option').given({
    attribute_id: color.insertId,
    attribute_code: 'color',
    option_text: 'Yellow'
  }).execute(pool);

  await insert('attribute_option').given({
    attribute_id: size.insertId,
    attribute_code: 'size',
    option_text: 'XXL'
  }).execute(pool);

  await insert('attribute_option').given({
    attribute_id: size.insertId,
    attribute_code: 'size',
    option_text: 'XL'
  }).execute(pool);

  await insert('attribute_option').given({
    attribute_id: size.insertId,
    attribute_code: 'size',
    option_text: 'SM'
  }).execute(pool);

  await execute(pool, `CREATE TABLE \`attribute_group\` (
  \`attribute_group_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`group_name\` text NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`attribute_group_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product attribute group'`);

  const defaultGroup = await insert('attribute_group').given({ group_name: 'Default' }).execute(pool);

  await execute(pool, `CREATE TABLE \`attribute_group_link\` (
  \`attribute_group_link_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`attribute_id\` int(10) unsigned NOT NULL,
  \`group_id\` int(10) unsigned NOT NULL,
  PRIMARY KEY (\`attribute_group_link_id\`),
  UNIQUE KEY \`UNIQUE_ATTRIBUE_GROUP\` (\`attribute_id\`,\`group_id\`),
  KEY \`FK_GROUP_LINK\` (\`group_id\`),
  CONSTRAINT \`FK_ATTRIBUTE_LINK\` FOREIGN KEY (\`attribute_id\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`FK_GROUP_LINK\` FOREIGN KEY (\`group_id\`) REFERENCES \`attribute_group\` (\`attribute_group_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Attribute and group linking table'`);

  await insert('attribute_group_link').given({ group_id: defaultGroup.insertId, attribute_id: color.insertId }).execute(pool);
  await insert('attribute_group_link').given({ group_id: defaultGroup.insertId, attribute_id: size.insertId }).execute(pool);

  await execute(pool, `CREATE TABLE \`variant_group\` (
  \`variant_group_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`attribute_group_id\` int(10) unsigned NOT NULL,
  \`attribute_one\` int(10) unsigned DEFAULT NULL,
  \`attribute_two\` int(10) unsigned DEFAULT NULL,
  \`attribute_three\` int(10) unsigned DEFAULT NULL,
  \`attribute_four\` int(10) unsigned DEFAULT NULL,
  \`attribute_five\` int(10) unsigned DEFAULT NULL,
  \`visibility\` int(2) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (\`variant_group_id\`),
  KEY \`FK_ATTRIBUTE_VARIANT_ONE\` (\`attribute_one\`),
  KEY \`FK_ATTRIBUTE_VARIANT_TWO\` (\`attribute_two\`),
  KEY \`FK_ATTRIBUTE_VARIANT_THREE\` (\`attribute_three\`),
  KEY \`FK_ATTRIBUTE_VARIANT_FOUR\` (\`attribute_four\`),
  KEY \`FK_ATTRIBUTE_VARIANT_FIVE\` (\`attribute_five\`),
  KEY \`FK_ATTRIBUTE_GROUP_VARIANT\` (\`attribute_group_id\`),
  CONSTRAINT \`FK_ATTRIBUTE_GROUP_VARIANT\` FOREIGN KEY (\`attribute_group_id\`) REFERENCES \`attribute_group\` (\`attribute_group_id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT \`FK_ATTRIBUTE_VARIANT_FIVE\` FOREIGN KEY (\`attribute_five\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT \`FK_ATTRIBUTE_VARIANT_FOUR\` FOREIGN KEY (\`attribute_four\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT \`FK_ATTRIBUTE_VARIANT_ONE\` FOREIGN KEY (\`attribute_one\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT \`FK_ATTRIBUTE_VARIANT_THREE\` FOREIGN KEY (\`attribute_three\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT \`FK_ATTRIBUTE_VARIANT_TWO\` FOREIGN KEY (\`attribute_two\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);

  await execute(pool, `CREATE TABLE \`customer_group\` (
  \`customer_group_id\` int(10) unsigned NOT NULL,
  \`group_name\` char(255) NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  \`row_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (\`customer_group_id\`),
  KEY \`row_id\` (\`row_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Customer group';
`);

  await execute(pool, `CREATE TABLE \`product\` (
  \`product_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`variant_group_id\` int(10) unsigned DEFAULT NULL,
  \`visibility\` smallint(2) DEFAULT NULL,
  \`group_id\` int(10) unsigned DEFAULT NULL,
  \`image\` varchar(255) DEFAULT NULL,
  \`sku\` varchar(255) NOT NULL,
  \`price\` decimal(12,4) NOT NULL,
  \`qty\` int(10) unsigned NOT NULL,
  \`weight\` decimal(12,4) DEFAULT NULL,
  \`manage_stock\` tinyint(1) unsigned NOT NULL,
  \`stock_availability\` tinyint(1) unsigned NOT NULL,
  \`tax_class\` smallint(6) DEFAULT NULL,
  \`status\` tinyint(1) unsigned NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`product_id\`),
  UNIQUE KEY \`UNIQUE_SKU\` (\`sku\`),
  KEY \`FK_PRODUCT_ATTRIBUTE_GROUP\` (\`group_id\`),
  KEY \`FK_PRODUCT_VARIANT_GROUP\` (\`variant_group_id\`),
  CONSTRAINT \`FK_PRODUCT_ATTRIBUTE_GROUP\` FOREIGN KEY (\`group_id\`) REFERENCES \`attribute_group\` (\`attribute_group_id\`) ON DELETE SET NULL,
  CONSTRAINT \`FK_PRODUCT_VARIANT_GROUP\` FOREIGN KEY (\`variant_group_id\`) REFERENCES \`variant_group\` (\`variant_group_id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product'`);

  await execute(pool, `CREATE TABLE \`product_attribute_value_index\` (
  \`product_attribute_value_index_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`product_id\` int(10) unsigned NOT NULL,
  \`attribute_id\` int(10) unsigned NOT NULL,
  \`option_id\` int(10) unsigned DEFAULT NULL,
  \`option_text\` text DEFAULT NULL,
  PRIMARY KEY (\`product_attribute_value_index_id\`),
  UNIQUE KEY \`UNIQUE_OPTION_VALUE\` (\`product_id\`,\`attribute_id\`,\`option_id\`),
  KEY \`FK_ATTRIBUTE_VALUE_LINK\` (\`attribute_id\`),
  KEY \`FK_ATTRIBUTE_OPTION_VALUE_LINK\` (\`option_id\`),
  CONSTRAINT \`FK_ATTRIBUTE_OPTION_VALUE_LINK\` FOREIGN KEY (\`option_id\`) REFERENCES \`attribute_option\` (\`attribute_option_id\`) ON DELETE CASCADE,
  CONSTRAINT \`FK_ATTRIBUTE_VALUE_LINK\` FOREIGN KEY (\`attribute_id\`) REFERENCES \`attribute\` (\`attribute_id\`) ON DELETE CASCADE,
  CONSTRAINT \`FK_PRODUCT_ATTRIBUTE_LINK\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product attribute value index'`);

  await execute(pool, `CREATE TABLE \`product_custom_option\` (
  \`product_custom_option_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`product_custom_option_product_id\` int(10) unsigned NOT NULL,
  \`option_name\` varchar(255) NOT NULL,
  \`option_type\` varchar(255) NOT NULL,
  \`is_required\` int(5) NOT NULL DEFAULT 0,
  \`sort_order\` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (\`product_custom_option_id\`),
  KEY \`FK_PRODUCT_CUSTOM_OPTION\` (\`product_custom_option_product_id\`),
  CONSTRAINT \`FK_PRODUCT_CUSTOM_OPTION\` FOREIGN KEY (\`product_custom_option_product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product custom option'`);

  await execute(pool, `CREATE TABLE \`product_custom_option_value\` (
  \`product_custom_option_value_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`option_id\` int(10) unsigned NOT NULL,
  \`extra_price\` decimal(12,4) DEFAULT NULL,
  \`sort_order\` int(10) unsigned DEFAULT NULL,
  \`value\` varchar(225) NOT NULL,
  PRIMARY KEY (\`product_custom_option_value_id\`),
  KEY \`FK_CUSTOM_OPTION_VALUE\` (\`option_id\`),
  CONSTRAINT \`FK_CUSTOM_OPTION_VALUE\` FOREIGN KEY (\`option_id\`) REFERENCES \`product_custom_option\` (\`product_custom_option_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product option value'`);

  await execute(pool, `CREATE TABLE \`product_description\` (
  \`product_description_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`product_description_product_id\` int(10) unsigned NOT NULL,
  \`name\` text NOT NULL,
  \`description\` longtext DEFAULT NULL,
  \`short_description\` longtext DEFAULT NULL,
  \`url_key\` varchar(255) NOT NULL,
  \`meta_title\` text DEFAULT NULL,
  \`meta_description\` longtext DEFAULT NULL,
  \`meta_keywords\` text DEFAULT NULL,
  PRIMARY KEY (\`product_description_id\`),
  UNIQUE KEY \`PRODUCT_ID_UNIQUE\` (\`product_description_product_id\`),
  CONSTRAINT \`FK_PRODUCT_DESCRIPTION\` FOREIGN KEY (\`product_description_product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product description'`);

  await execute(pool, `CREATE TABLE \`product_image\` (
  \`product_image_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`product_image_product_id\` int(10) unsigned NOT NULL,
  \`image\` varchar(225) NOT NULL,
  PRIMARY KEY (\`product_image_id\`),
  KEY \`FK_PRODUCT_IMAGE_LINK\` (\`product_image_product_id\`),
  CONSTRAINT \`FK_PRODUCT_IMAGE_LINK\` FOREIGN KEY (\`product_image_product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product image'`);

  await execute(pool, `CREATE TABLE \`product_price\` (
  \`product_price_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`product_price_product_id\` int(10) unsigned NOT NULL,
  \`tier_price\` decimal(12,4) NOT NULL,
  \`customer_group_id\` int(10) unsigned NOT NULL DEFAULT 0,
  \`qty\` int(10) unsigned NOT NULL DEFAULT 0,
  \`active_from\` datetime DEFAULT NULL,
  \`active_to\` datetime DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`product_price_id\`),
  UNIQUE KEY \`UNIQUE_CUSTOMER_PRODUCT_PRICE_QTY\` (\`product_price_product_id\`,\`customer_group_id\`,\`qty\`),
  KEY \`FK_PRICE_PRODUCT\` (\`product_price_product_id\`),
  KEY \`FK_PRICE_CUSTOMER_GROUP\` (\`customer_group_id\`),
  CONSTRAINT \`FK_PRICE_CUSTOMER_GROUP\` FOREIGN KEY (\`customer_group_id\`) REFERENCES \`customer_group\` (\`customer_group_id\`) ON DELETE CASCADE,
  CONSTRAINT \`FK_PRICE_PRODUCT\` FOREIGN KEY (\`product_price_product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product advanced price'`);

  await execute(pool, `CREATE TABLE \`category\` (
  \`category_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`status\` smallint(6) NOT NULL,
  \`parent_id\` int(10) unsigned DEFAULT NULL,
  \`include_in_nav\` smallint(5) unsigned NOT NULL,
  \`position\` smallint(5) unsigned DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`category_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Category'`);

  await execute(pool, `CREATE TABLE \`product_category\` (
  \`product_category_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`category_id\` int(10) unsigned NOT NULL,
  \`product_id\` int(10) unsigned NOT NULL,
  PRIMARY KEY (\`product_category_id\`),
  UNIQUE KEY \`PRODUCT_CATEGORY_UNIQUE\` (\`category_id\`,\`product_id\`),
  KEY \`FK_PRODUCT_CATEGORY_LINK\` (\`product_id\`),
  CONSTRAINT \`FK_CATEGORY_PRODUCT_LINK\` FOREIGN KEY (\`category_id\`) REFERENCES \`category\` (\`category_id\`) ON DELETE CASCADE,
  CONSTRAINT \`FK_PRODUCT_CATEGORY_LINK\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Product and category link'`);

  await execute(pool, `CREATE TABLE \`category_description\` (
  \`category_description_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`category_description_category_id\` int(10) unsigned NOT NULL,
  \`name\` text NOT NULL,
  \`short_description\` text DEFAULT NULL,
  \`description\` longtext DEFAULT NULL,
  \`image\` varchar(255) DEFAULT NULL,
  \`meta_title\` text DEFAULT NULL,
  \`meta_keywords\` text DEFAULT NULL,
  \`meta_description\` longtext DEFAULT NULL,
  \`url_key\` char(255) NOT NULL,
  PRIMARY KEY (\`category_description_id\`),
  UNIQUE KEY \`CATEGORY_ID_UNIQUE\` (\`category_description_category_id\`),
  CONSTRAINT \`FK_CATEGORY_DESCRIPTION\` FOREIGN KEY (\`category_description_category_id\`) REFERENCES \`category\` (\`category_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Category description'`);

  /* CREATE SOME TRIGGERS */

  await execute(pool, `CREATE TRIGGER \`TRIGGER_REMOVE_ATTRIBUTE_FROM_GROUP\` AFTER DELETE ON \`attribute_group_link\` FOR EACH ROW BEGIN
                
                        DELETE FROM \`product_attribute_value_index\` WHERE product_attribute_value_index.attribute_id = OLD.attribute_id AND product_attribute_value_index.product_id IN (SELECT product.product_id FROM product WHERE product.group_id = OLD.group_id);
                
                        DELETE FROM \`variant_group\` WHERE \`variant_group\`.\`attribute_group_id\` = OLD.group_id AND (\`variant_group\`.\`attribute_one\` = OLD.attribute_id OR \`variant_group\`.\`attribute_two\` = OLD.attribute_id OR \`variant_group\`.\`attribute_three\` = OLD.attribute_id OR \`variant_group\`.\`attribute_four\` = OLD.attribute_id OR \`variant_group\`.\`attribute_five\` = OLD.attribute_id);
                    
                    END`);
  await execute(pool, `CREATE TRIGGER \`TRIGGER_ATTRIBUTE_OPTION_UPDATE\` AFTER UPDATE ON \`attribute_option\` FOR EACH ROW UPDATE \`product_attribute_value_index\` SET \`product_attribute_value_index\`.\`option_text\` = NEW.option_text
                        
                        WHERE \`product_attribute_value_index\`.option_id = NEW.attribute_option_id AND \`product_attribute_value_index\`.attribute_id = NEW.attribute_id`);

  await execute(pool, `CREATE TRIGGER \`TRIGGER_AFTER_DELETE_ATTRIBUTE_OPTION\` AFTER DELETE ON \`attribute_option\` FOR EACH ROW BEGIN
                    
                        DELETE FROM \`product_attribute_value_index\` WHERE \`product_attribute_value_index\`.option_id = OLD.attribute_option_id AND \`product_attribute_value_index\`.\`attribute_id\` = OLD.attribute_id;
                    
                    END`);

  await execute(pool, `CREATE TRIGGER \`TRIGGER_AFTER_INSERT_PRODUCT\` AFTER INSERT ON \`product\` FOR EACH ROW BEGIN
                    
                        UPDATE \`variant_group\` SET visibility = (SELECT MAX(visibility) FROM \`product\` WHERE \`product\`.\`variant_group_id\` = new.variant_group_id AND \`product\`.\`status\` = 1 GROUP BY \`product\`.\`variant_group_id\`) WHERE \`variant_group\`.\`variant_group_id\` = new.variant_group_id;
                    
                    END`);

  await execute(pool, `CREATE TRIGGER \`TRIGGER_PRODUCT_AFTER_UPDATE\` AFTER UPDATE ON \`product\` FOR EACH ROW BEGIN

                        DELETE FROM \`product_attribute_value_index\`

                        WHERE \`product_attribute_value_index\`.\`product_id\` = New.product_id 

                        AND \`product_attribute_value_index\`.\`attribute_id\` NOT IN (SELECT \`attribute_group_link\`.\`attribute_id\` FROM \`attribute_group_link\` WHERE \`attribute_group_link\`.\`group_id\` = NEW.group_id);

                        UPDATE \`variant_group\` SET visibility = (SELECT MAX(visibility) FROM \`product\` WHERE \`product\`.\`variant_group_id\` = NEW.variant_group_id AND \`product\`.\`status\` = 1 GROUP BY \`product\`.\`variant_group_id\`) WHERE \`variant_group\`.\`variant_group_id\` = NEW.variant_group_id;

                        UPDATE \`variant_group\` SET visibility = (SELECT MAX(visibility) FROM \`product\` WHERE \`product\`.\`variant_group_id\` = OLD.variant_group_id AND \`product\`.\`status\` = 1 GROUP BY \`product\`.\`variant_group_id\`) WHERE \`variant_group\`.\`variant_group_id\` = OLD.variant_group_id;

                    END`);
};
