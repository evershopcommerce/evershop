import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import createVariantGroup from '../../services/variant/createVariantGroup.js';
import { VariantGroupError } from '../../services/variant/VariantGroupError.js';

export default async (request, response, next) => {
  const { attribute_codes, attribute_group_id } = request.body;
  try {
    const { group, attributes } = await createVariantGroup({
      attribute_codes,
      attribute_group_id
    });

    const promises = attributes.map(async (attribute) => {
      const { attribute_id } = attribute;
      const options = await select()
        .from('attribute_option')
        .where('attribute_id', '=', attribute_id)
        .execute(pool);
      return {
        ...attribute,
        options
      };
    });

    const results = await Promise.all(promises);

    group.attributes = results;
    group.addItemApi = buildUrl('addVariantItem', { id: group.uuid });

    response.status(OK);
    response.json({
      data: group
    });
  } catch (e) {
    if (e instanceof VariantGroupError) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: e.message
        }
      });
      return;
    }
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
