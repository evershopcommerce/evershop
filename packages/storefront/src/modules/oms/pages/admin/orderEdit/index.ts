import { select } from '@storefront/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { StorefrontRequest } from '../../../../../types/request.js';
import { StorefrontResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (
  request: StorefrontRequest,
  response: StorefrontResponse,
  next
) => {
  try {
    const query = select();
    query.from('order');
    query.andWhere('order.uuid', '=', request.params.id);
    const order = await query.load(pool);

    if (order === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'orderId', order.uuid);
      setContextValue(request, 'orderCurrency', order.currency);
      setPageMetaInfo(request, {
        title: `Order #${order.order_number}`,
        description: `Order #${order.order_number}`
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
