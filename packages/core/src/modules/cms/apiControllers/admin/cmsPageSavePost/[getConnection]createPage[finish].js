const { insert } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response, stack) => {
  if (request.body.cms_page_id) { return null; }
  const data = request.body;
  const connection = await stack.getConnection;
  const result = await insert('cms_page').given({ ...data, layout: 'oneColumn' }).execute(connection);
  await insert('cms_page_description')
    .given(data)
    .prime('cms_page_description_cms_page_id', result.insertId).execute(connection);

  return result;
};
