/* eslint-disable no-unused-vars */
const { del, select } = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection();
  try {
    const { id } = request.params;
    const attributeGroup = await select()
      .from('attribute_group')
      .where('uuid', '=', id)
      .load(connection);

    if (!attributeGroup) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Attribute group not found'
        }
      });
      return;
    }

    if (parseInt(attributeGroup.attribute_group_id, 10) === 1) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not delete the default attribute group'
        }
      });
      return;
    }

    await del('attribute_group').where('uuid', '=', id).execute(connection);

    response.status(OK);
    response.json({
      data: attributeGroup
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
