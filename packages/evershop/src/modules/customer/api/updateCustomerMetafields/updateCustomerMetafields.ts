import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { setCustomerMetafields } from '../../services/customer/customerMetafield.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const customer = await select()
      .from('customer')
      .where('uuid', '=', request.params.id as string)
      .load(pool);
    if (!customer) {
      response.status(NOT_FOUND);
      response.json({
        error: { status: NOT_FOUND, message: 'Customer not found' }
      });
      return;
    }
    await setCustomerMetafields(
      customer.customer_id,
      request.body.metafields ?? {}
    );
    const saved = await select('meta_data')
      .from('customer')
      .where('customer_id', '=', customer.customer_id)
      .load(pool);
    response.status(OK);
    response.json({ data: { metaData: saved?.meta_data ?? {} } });
  } catch (e) {
    const status = (e as any).status ?? INTERNAL_SERVER_ERROR;
    response.status(status);
    response.json({ error: { status, message: (e as Error).message } });
  }
};
