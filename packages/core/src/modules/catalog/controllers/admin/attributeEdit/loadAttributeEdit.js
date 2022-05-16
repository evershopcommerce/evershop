const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  const query = select();
  const attributeId = request.params.id;
  query.from('attribute').where('attribute_id', '=', attributeId);
  const attribute = await query.load(pool);
  if (attribute === null) {
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'error',
      message: 'Requested attribute does not exist'
    });
    request.session.save();
    response.redirect(302, buildUrl('attributeGrid'));
  } else {
    /* Load attribute options */
    attribute.options = await select().from('attribute_option').where('attribute_id', '=', attributeId).execute(pool);
    assign(response.context, { attribute: JSON.parse(JSON.stringify(attribute)) });
    assign(response.context, { page: { heading: attribute.attribute_name } });
    next();
  }
};
