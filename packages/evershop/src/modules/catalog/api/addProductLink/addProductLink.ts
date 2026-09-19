import { error } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import {
  ApiLinkType,
  createProductLink,
  ProductLinkError
} from '../../services/recommendation/productLink.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: Error) => void
) => {
  try {
    const link = await createProductLink({
      productUuid: String(request.params.product_id),
      linkedProductUuid: request.body.linked_product_id,
      type: request.body.type as ApiLinkType,
      sortOrder:
        request.body.sort_order !== undefined
          ? parseInt(String(request.body.sort_order), 10)
          : undefined
    });
    response.status(OK);
    response.json({
      success: true,
      data: {
        uuid: link.uuid,
        product_id: link.product_id,
        linked_product_id: link.linked_product_id,
        type: link.type,
        sort_order: link.sort_order
      }
    });
  } catch (e) {
    if (e instanceof ProductLinkError) {
      response.status(e.status);
      response.json({ success: false, message: e.message });
      return;
    }
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({ success: false, message: 'Failed to add product link' });
  }
};
