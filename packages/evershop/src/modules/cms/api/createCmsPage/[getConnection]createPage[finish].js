const { insert } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate) => {
  const data = request.body;
  const connection = await delegate.getConnection;
  const result = await insert('cms_page')
    .given({ ...data })
    .execute(connection, false);

  await insert('cms_page_description')
    .given(data)
    .prime('cms_page_description_cms_page_id', result.insertId)
    .execute(connection, false);

  return result;
};
