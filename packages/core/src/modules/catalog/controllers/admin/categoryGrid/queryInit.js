const { select } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response) => {
  const query = select('*').from('category');
  query.leftJoin('category_description').on('category.`category_id`', '=', 'category_description.`category_description_category_id`');

  return query;
};
