import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response, next) => {
  try {
    const query = select();
    query.from('coupon');
    query.andWhere('coupon.uuid', '=', request.params.id);
    const coupon = await query.load(pool);

    if (coupon === null) {
      response.redirect(302, buildUrl('couponGrid'));
    } else {
      setContextValue(request, 'couponId', parseInt(coupon.coupon_id, 10));
      setContextValue(request, 'couponUuid', coupon.uuid);
      setContextValue(request, 'pageInfo', {
        title: coupon.coupon,
        description: coupon.coupon
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
