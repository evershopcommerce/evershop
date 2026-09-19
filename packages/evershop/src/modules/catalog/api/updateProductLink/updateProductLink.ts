import { error } from '../../../../lib/log/logger.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import {
  ProductLinkError,
  updateProductLink
} from '../../services/recommendation/productLink.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: (err?: Error) => void
) => {
  try {
    const link = await updateProductLink({
      productUuid: String(request.params.product_id),
      linkUuid: String(request.params.link_uuid),
      sortOrder: parseInt(String(request.body.sort_order), 10)
    });
    response.status(OK);
    response.json({
      success: true,
      data: { uuid: link.uuid, sort_order: link.sort_order }
    });
  } catch (e) {
    if (e instanceof ProductLinkError) {
      response.status(e.status);
      response.json({ success: false, message: e.message });
      return;
    }
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({ success: false, message: 'Failed to update product link' });
  }
};
