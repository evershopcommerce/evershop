const { update, select } = require('@evershop/postgres-query-builder');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = async (request, response, delegate) => {
  const data = request.body;
  const connection = await delegate.getConnection;

  const page = await select()
    .from('cms_page')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (!page) {
    response.status(INVALID_PAYLOAD);
    throw new Error('Invalid page id');
  }

  try {
    await update('cms_page')
      .given(data)
      .where('uuid', '=', request.params.id)
      .execute(connection);

    await update('cms_page_description')
      .given(request.body)
      .where('cms_page_description_cms_page_id', '=', page.cms_page_id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return request.params.id;
};
