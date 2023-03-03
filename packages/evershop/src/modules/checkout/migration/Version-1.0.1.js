const { execute } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    "ALTER TABLE cart MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE cart ADD UNIQUE KEY `CART_UUID` (`uuid`)'
  );

  await execute(
    connection,
    "ALTER TABLE cart_address MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE cart_address ADD UNIQUE KEY `CART_ADDRESS_UUID` (`uuid`)'
  );

  await execute(
    connection,
    "ALTER TABLE cart_item MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE cart_item ADD UNIQUE KEY `CART_ITEM_UUID` (`uuid`)'
  );

  await execute(
    connection,
    "ALTER TABLE `order` MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE `order` ADD UNIQUE KEY `ORDER_UUID` (`uuid`)'
  );

  await execute(
    connection,
    'ALTER TABLE order_activity ADD COLUMN uuid varchar(36) NOT NULL DEFAULT "" AFTER order_activity_id'
  );
  await execute(
    connection,
    "UPDATE order_activity SET uuid = replace(uuid(),'-','') WHERE uuid = ''"
  );
  await execute(
    connection,
    "ALTER TABLE order_activity MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE order_activity ADD UNIQUE KEY `ORDER_ACTIVITY_UUID` (`uuid`)'
  );

  await execute(
    connection,
    "ALTER TABLE order_address MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    "UPDATE order_address SET uuid = replace(uuid(),'-','')"
  );
  await execute(
    connection,
    'ALTER TABLE order_address ADD UNIQUE KEY `ORDER_ADDRESS_UUID` (`uuid`)'
  );

  await execute(
    connection,
    "ALTER TABLE order_item MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE order_item ADD UNIQUE KEY `ORDER_ITEM_UUID` (`uuid`)'
  );

  await execute(
    connection,
    "ALTER TABLE payment_transaction MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE payment_transaction ADD UNIQUE KEY `PAYMENT_TRANSACTION_UUID` (`uuid`)'
  );
  await execute(
    connection,
    'ALTER TABLE payment_transaction ADD KEY `FK_PAYMENT_TRANSACTION_ORDER` (`payment_transaction_order_id`)'
  );

  await execute(
    connection,
    "ALTER TABLE shipment MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE shipment ADD UNIQUE KEY `SHIPMENT_UUID` (`uuid`)'
  );

  // Delete a foreign key constraint from order item table
  await execute(
    connection,
    'ALTER TABLE `order_item` DROP FOREIGN KEY `FK_PRODUCT`'
  );
  await execute(connection, 'ALTER TABLE `order_item` DROP INDEX `FK_PRODUCT`');
};
