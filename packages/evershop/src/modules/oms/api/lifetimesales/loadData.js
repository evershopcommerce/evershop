import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';

export default async (request, response, next) => {
  const query = select();
  query
    .from('order')
    .select('grand_total', 'total')
    .select('payment_status')
    .select('shipment_status');
  const results = await query.execute(pool);

  let total = 0;
  let cancelled = 0;
  let completed = 0;
  results.forEach((result) => {
    total += parseFloat(result.total);
    if (
      result.payment_status === 'paid' &&
      result.shipment_status === 'delivered'
    ) {
      completed += 1;
    }
    if (
      result.payment_status === 'cancelled' &&
      result.shipment_status === 'cancelled'
    ) {
      cancelled += 1;
    }
  });
  const currency = getConfig('shop.currency', 'USD');
  const language = getConfig('shop.language', 'en');
  const formatedTotal = new Intl.NumberFormat(language, {
    style: 'currency',
    currency
  }).format(total);

  response.json({
    orders: results.length,
    total: formatedTotal,
    completed_percentage:
      results.length === 0 ? 0 : Math.round((completed / results.length) * 100),
    cancelled_percentage:
      results.length === 0 ? 0 : Math.round((cancelled / results.length) * 100)
  });
};
