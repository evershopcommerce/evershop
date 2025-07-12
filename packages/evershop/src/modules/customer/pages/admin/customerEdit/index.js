import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
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
      setContextValue(request, 'pageInfo', {
        title: customer.full_name,
        description: customer.full_name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
