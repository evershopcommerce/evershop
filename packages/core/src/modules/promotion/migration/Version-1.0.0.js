const { execute, insert } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(pool, `CREATE TABLE \`coupon\` (
  \`coupon_id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  \`status\` smallint(6) NOT NULL DEFAULT 1,
  \`description\` char(255) NOT NULL,
  \`discount_amount\` decimal(12,4) NOT NULL,
  \`free_shipping\` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  \`discount_type\` varchar(255) NOT NULL DEFAULT '1',
  \`coupon\` char(255) NOT NULL,
  \`used_time\` int(10) UNSIGNED NOT NULL DEFAULT 0,
  \`target_products\` longtext DEFAULT NULL,
  \`condition\` longtext NOT NULL,
  \`user_condition\` longtext DEFAULT NULL,
  \`buyx_gety\` longtext DEFAULT NULL,
  \`max_uses_time_per_coupon\` int(10) UNSIGNED DEFAULT NULL,
  \`max_uses_time_per_customer\` int(10) UNSIGNED DEFAULT NULL,
  \`start_date\` datetime DEFAULT NULL,
  \`end_date\` datetime DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`coupon_id\`),
  UNIQUE KEY \`UNIQUE_COUPON\` (\`coupon\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Coupon'`);

  await execute(pool, `CREATE TRIGGER \`TRIGGER_UPDATE_COUPON_USED_TIME_AFTER_CREATE_ORDER\` AFTER INSERT ON \`order\` FOR EACH ROW BEGIN
                  
          UPDATE \`coupon\` SET \`coupon\`.used_time = \`coupon\`.used_time + 1 WHERE \`coupon\`.coupon = NEW.coupon;
  
                    END`);
}