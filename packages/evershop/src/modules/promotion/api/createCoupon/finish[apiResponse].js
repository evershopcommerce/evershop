import { getDelegate } from '../../../../lib/middleware/delegate.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { OK } from '../../../../lib/util/httpStatus.js';

export default async (request, response, next) => {
  const coupon = await getDelegate('createCoupon', request);
  response.status(OK);
  response.json({
    data: {
      ...coupon,
      links: [
        {
          rel: 'couponGrid',
          href: buildUrl('couponGrid'),
          action: 'GET',
          types: ['text/xml']
        },
        {
          rel: 'edit',
          href: buildUrl('couponEdit', { id: coupon.uuid }),
          action: 'GET',
          types: ['text/xml']
        }
      ]
    }
  });
};
