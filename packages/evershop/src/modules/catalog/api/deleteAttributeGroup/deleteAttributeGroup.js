import { del, select } from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
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
