const { execute } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `CREATE TABLE \`cart\` (
  \`cart_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`currency\` varchar(11) NOT NULL,
  \`customer_id\` int(10) unsigned DEFAULT NULL,
  \`customer_group_id\` smallint(6) DEFAULT NULL,
  \`customer_email\` varchar(255) DEFAULT NULL,
  \`customer_full_name\` varchar(255) DEFAULT NULL,
  \`user_ip\` varchar(255) DEFAULT NULL,
  \`status\` tinyint(5) NOT NULL,
  \`coupon\` varchar(255) DEFAULT NULL,
  \`shipping_fee_excl_tax\` decimal(12,4) DEFAULT NULL,
  \`shipping_fee_incl_tax\` decimal(12,4) DEFAULT NULL,
  \`discount_amount\` decimal(12,4) NOT NULL,
  \`sub_total\` decimal(12,4) NOT NULL,
  \`total_qty\` int(10) unsigned NOT NULL,
  \`total_weight\` decimal(12,4) DEFAULT NULL,
  \`tax_amount\` decimal(12,4) NOT NULL,
  \`grand_total\` decimal(12,4) NOT NULL,
  \`shipping_method\` varchar(255) DEFAULT NULL,
  \`shipping_method_name\` char(255) DEFAULT NULL,
  \`shipping_address_id\` int(10) unsigned DEFAULT NULL,
  \`payment_method\` char(255) DEFAULT NULL,
  \`payment_method_name\` char(255) DEFAULT NULL,
  \`billing_address_id\` int(10) unsigned DEFAULT NULL,
  \`shipping_note\` text DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`cart_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Cart';
`);

  await execute(pool, `CREATE TABLE \`cart_address\` (
  \`cart_address_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`full_name\` varchar(255) DEFAULT NULL,
  \`postcode\` varchar(255) DEFAULT NULL,
  \`telephone\` varchar(255) DEFAULT NULL,
  \`country\` varchar(255) DEFAULT NULL,
  \`province\` varchar(255) DEFAULT NULL,
  \`city\` varchar(255) DEFAULT NULL,
  \`address_1\` varchar(255) DEFAULT NULL,
  \`address_2\` char(255) DEFAULT NULL,
  PRIMARY KEY (\`cart_address_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Cart address';
`);

  await execute(pool, `CREATE TABLE \`cart_item\` (
  \`cart_item_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`cart_id\` int(10) unsigned NOT NULL,
  \`product_id\` int(10) unsigned NOT NULL,
  \`product_sku\` varchar(255) NOT NULL,
  \`product_name\` text NOT NULL,
  \`product_weight\` decimal(12,4) DEFAULT NULL,
  \`product_price\` decimal(12,4) NOT NULL,
  \`product_price_incl_tax\` decimal(12,4) NOT NULL,
  \`qty\` int(11) NOT NULL,
  \`final_price\` decimal(12,4) NOT NULL,
  \`final_price_incl_tax\` decimal(12,4) NOT NULL,
  \`tax_percent\` decimal(12,4) NOT NULL,
  \`tax_amount\` decimal(12,4) NOT NULL,
  \`discount_amount\` decimal(12,4) NOT NULL,
  \`total\` decimal(12,4) NOT NULL,
  \`variant_group_id\` int(10) unsigned DEFAULT NULL,
  \`variant_options\` text DEFAULT NULL,
  \`product_custom_options\` text DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`cart_item_id\`),
  KEY \`FK_CART_ITEM\` (\`cart_id\`),
  KEY \`FK_CART_ITEM_PRODUCT\` (\`product_id\`),
  CONSTRAINT \`FK_CART_ITEM\` FOREIGN KEY (\`cart_id\`) REFERENCES \`cart\` (\`cart_id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`FK_CART_ITEM_PRODUCT\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Cart item';
`);

  await execute(pool, `CREATE TABLE \`order\` (
  \`order_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`order_number\` varchar(255) NOT NULL,
  \`cart_id\` int(10) unsigned NOT NULL,
  \`currency\` varchar(11) NOT NULL,
  \`customer_id\` int(10) unsigned DEFAULT NULL,
  \`customer_email\` varchar(255) DEFAULT NULL,
  \`customer_full_name\` varchar(255) DEFAULT NULL,
  \`user_ip\` varchar(255) DEFAULT NULL,
  \`user_agent\` varchar(255) DEFAULT NULL,
  \`coupon\` varchar(255) DEFAULT NULL,
  \`shipping_fee_excl_tax\` decimal(12,4) DEFAULT NULL,
  \`shipping_fee_incl_tax\` decimal(12,4) DEFAULT NULL,
  \`discount_amount\` decimal(12,4) DEFAULT NULL,
  \`sub_total\` decimal(12,4) NOT NULL,
  \`total_qty\` int(10) unsigned NOT NULL,
  \`total_weight\` decimal(12,4) DEFAULT NULL,
  \`tax_amount\` decimal(12,4) NOT NULL,
  \`shipping_note\` text DEFAULT NULL,
  \`grand_total\` decimal(12,4) NOT NULL,
  \`shipping_method\` varchar(255) DEFAULT NULL,
  \`shipping_method_name\` char(255) DEFAULT NULL,
  \`shipping_address_id\` int(10) unsigned DEFAULT NULL,
  \`payment_method\` varchar(255) DEFAULT NULL,
  \`payment_method_name\` char(255) DEFAULT NULL,
  \`billing_address_id\` int(10) unsigned DEFAULT NULL,
  \`shipment_status\` varchar(255) NOT NULL DEFAULT '0',
  \`payment_status\` varchar(255) NOT NULL DEFAULT '0',
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`order_id\`),
  UNIQUE KEY \`ORDER_NUMBER_UNIQUE\` (\`order_number\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Order';
`);

  await execute(pool, `CREATE TABLE \`order_activity\` (
  \`order_activity_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`order_activity_order_id\` int(10) unsigned NOT NULL,
  \`comment\` text NOT NULL,
  \`customer_notified\` smallint(5) unsigned NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`order_activity_id\`),
  KEY \`FK_ORDER_ACTIVITY\` (\`order_activity_order_id\`),
  CONSTRAINT \`FK_ORDER_ACTIVITY\` FOREIGN KEY (\`order_activity_order_id\`) REFERENCES \`order\` (\`order_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Order activity';
`);

  await execute(pool, `CREATE TABLE \`order_address\` (
  \`order_address_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`full_name\` varchar(255) DEFAULT NULL,
  \`postcode\` varchar(255) DEFAULT NULL,
  \`telephone\` varchar(255) DEFAULT NULL,
  \`country\` varchar(255) DEFAULT NULL,
  \`province\` varchar(255) DEFAULT NULL,
  \`city\` varchar(255) DEFAULT NULL,
  \`address_1\` varchar(255) DEFAULT NULL,
  \`address_2\` varchar(255) DEFAULT NULL,
  PRIMARY KEY (\`order_address_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Order address';
`);

  await execute(pool, `CREATE TABLE \`order_item\` (
  \`order_item_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`order_item_order_id\` int(10) unsigned NOT NULL,
  \`product_id\` int(10) unsigned NOT NULL,
  \`referer\` int(10) unsigned DEFAULT NULL,
  \`product_sku\` varchar(255) NOT NULL,
  \`product_name\` text NOT NULL,
  \`product_weight\` decimal(12,4) DEFAULT NULL,
  \`product_price\` decimal(12,4) NOT NULL,
  \`product_price_incl_tax\` decimal(12,4) NOT NULL,
  \`qty\` int(11) NOT NULL,
  \`final_price\` decimal(12,4) NOT NULL,
  \`final_price_incl_tax\` decimal(12,4) NOT NULL,
  \`tax_percent\` decimal(12,4) NOT NULL,
  \`tax_amount\` decimal(12,4) NOT NULL,
  \`discount_amount\` decimal(12,4) NOT NULL,
  \`total\` decimal(12,4) NOT NULL,
  \`variant_group_id\` int(10) unsigned DEFAULT NULL,
  \`variant_options\` text DEFAULT NULL,
  \`product_custom_options\` text DEFAULT NULL,
  \`requested_data\` text DEFAULT NULL,
  PRIMARY KEY (\`order_item_id\`),
  KEY \`FK_ORDER\` (\`order_item_order_id\`),
  KEY \`FK_PRODUCT\` (\`product_id\`),
  CONSTRAINT \`FK_ORDER\` FOREIGN KEY (\`order_item_order_id\`) REFERENCES \`order\` (\`order_id\`) ON DELETE CASCADE,
  CONSTRAINT \`FK_PRODUCT\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\` (\`product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Order item';
`);

  await execute(pool, `CREATE TABLE \`payment_transaction\` (
  \`payment_transaction_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`payment_transaction_order_id\` int(10) unsigned NOT NULL,
  \`transaction_id\` varchar(100) DEFAULT NULL,
  \`transaction_type\` char(255) NOT NULL,
  \`amount\` decimal(12,4) NOT NULL,
  \`parent_transaction_id\` varchar(100) DEFAULT NULL,
  \`payment_action\` varchar(15) DEFAULT NULL,
  \`additional_information\` text DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`payment_transaction_id\`),
  UNIQUE KEY \`UNQ_PAYMENT_TRANSACTION_ID_ORDER_ID\` (\`payment_transaction_order_id\`,\`transaction_id\`),
  CONSTRAINT \`FK_PAYMENT_TRANSACTION_ORDER\` FOREIGN KEY (\`payment_transaction_order_id\`) REFERENCES \`order\` (\`order_id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Payment transaction';
`);

  await execute(pool, `CREATE TABLE \`shipment\` (
  \`shipment_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`shipment_order_id\` int(10) unsigned NOT NULL,
  \`carrier_name\` varchar(255) DEFAULT NULL,
  \`tracking_number\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`shipment_id\`),
  KEY \`FK_ORDER_SHIPMENT\` (\`shipment_order_id\`),
  CONSTRAINT \`FK_ORDER_SHIPMENT\` FOREIGN KEY (\`shipment_order_id\`) REFERENCES \`order\` (\`order_id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Shipment';
`);
};
