const { execute } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../lib/mysql/connection');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async () => {
  await execute(
    pool,
    "ALTER TABLE cms_page MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    pool,
    'ALTER TABLE cms_page ADD UNIQUE KEY `CMS_PAGE_UUID` (`uuid`)'
  );

  await execute(
    pool,
    'ALTER TABLE cms_page_description ADD KEY `FK_CMS_PAGE` (`cms_page_description_cms_page_id`)'
  );
};
