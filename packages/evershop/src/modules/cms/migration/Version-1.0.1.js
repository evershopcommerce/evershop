const { execute } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    "ALTER TABLE cms_page MODIFY uuid varchar(36) NOT NULL DEFAULT (replace(uuid(),'-',''))"
  );
  await execute(
    connection,
    'ALTER TABLE cms_page ADD UNIQUE KEY `CMS_PAGE_UUID` (`uuid`)'
  );

  await execute(
    connection,
    'ALTER TABLE cms_page_description ADD KEY `FK_CMS_PAGE` (`cms_page_description_cms_page_id`)'
  );
};
