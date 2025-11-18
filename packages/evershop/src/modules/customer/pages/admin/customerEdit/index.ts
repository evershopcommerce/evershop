import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response: EvershopResponse, next) => {
  try {
    const query = select();
    query.from('customer');
    query.andWhere('customer.uuid', '=', request.params.id);
    const customer = await query.load(pool);

    if (customer === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'customerId', customer.customer_id);
      setContextValue(request, 'customerUuid', customer.uuid);
      setPageMetaInfo(request, {
        title: customer.full_name,
        description: customer.full_name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
