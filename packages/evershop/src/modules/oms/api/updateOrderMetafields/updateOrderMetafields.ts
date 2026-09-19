import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { setOrderMetafields } from '../../services/orderMetafield.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const order = await select()
      .from('order')
      .where('uuid', '=', request.params.id as string)
      .load(pool);
    if (!order) {
      response.status(NOT_FOUND);
      response.json({ error: { status: NOT_FOUND, message: 'Order not found' } });
      return;
    }
    await setOrderMetafields(order.order_id, request.body.metafields ?? {});
    const saved = await select('meta_data')
      .from('order')
      .where('order_id', '=', order.order_id)
      .load(pool);
    response.status(OK);
    response.json({ data: { metaData: saved?.meta_data ?? {} } });
  } catch (e) {
    const status = (e as any).status ?? INTERNAL_SERVER_ERROR;
    response.status(status);
    response.json({ error: { status, message: (e as Error).message } });
  }
};
