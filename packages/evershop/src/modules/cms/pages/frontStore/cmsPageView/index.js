const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query
      .from('cms_page')
      .leftJoin('cms_page_description')
      .on(
        'cms_page.cms_page_id',
        '=',
        'cms_page_description.cms_page_description_cms_page_id'
      );

    query.where('cms_page_description.url_key', '=', request.params.url_key);
    const page = await query.load(pool);

    if (page === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'pageId', page.cms_page_id);
      setContextValue(request, 'pageInfo', {
        title: page.meta_title || page.name,
        description: page.meta_description || page.meta_title,
        url: request.url
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
