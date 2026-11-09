import uniqid from 'uniqid';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '../../../../lib/util/httpStatus.js';
import addVariantItem from '../../services/variant/addVariantItem.js';
import { VariantGroupError } from '../../services/variant/VariantGroupError.js';

export default async (request, response, next) => {
  const { id: groupId } = request.params;

  const { product_id } = request.body;
  try {
    const { product, attributes } = await addVariantItem(groupId, product_id);
    response.status(OK);
    response.json({
      data: {
        id: uniqid(),
        attributes,
        product
      }
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
