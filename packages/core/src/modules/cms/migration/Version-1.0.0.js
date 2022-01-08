const { execute } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");

module.exports = exports = async () => {
  await execute(pool, `CREATE TABLE \`cms_page\` (
  \`cms_page_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`layout\` varchar(255) NOT NULL,
  \`status\` smallint(6) DEFAULT NULL,
  \`created_at\` datetime DEFAULT NULL,
  \`updated_at\` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (\`cms_page_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Cms page';
`);

  await execute(pool, `CREATE TABLE \`cms_page_description\` (
  \`cms_page_description_id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`cms_page_description_cms_page_id\` int(10) unsigned DEFAULT NULL,
  \`url_key\` varchar(255) NOT NULL,
  \`name\` text NOT NULL,
  \`content\` longtext DEFAULT NULL,
  \`meta_title\` varchar(255) DEFAULT NULL,
  \`meta_keywords\` varchar(255) DEFAULT NULL,
  \`meta_description\` text DEFAULT NULL,
  PRIMARY KEY (\`cms_page_description_id\`),
  UNIQUE KEY \`PAGE_ID_UNIQUE\` (\`cms_page_description_cms_page_id\`),
  CONSTRAINT \`FK_CMS_PAGE_DESCRIPTION\` FOREIGN KEY (\`cms_page_description_cms_page_id\`) REFERENCES \`cms_page\` (\`cms_page_id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Cms page description';
`);
}