const { select } = require('@nodejscart/mysql-query-builder');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response) => {
  const query = select('*').from('cms_page');
  query.leftJoin('cms_page_description').on('cms_page.`cms_page_id`', '=', 'cms_page_description.`cms_page_description_cms_page_id`');

  return query;
};
