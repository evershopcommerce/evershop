import { select } from '@evershop/postgres-query-builder';
import dayjs from 'dayjs';
import { pool } from '../../../../lib/postgres/connection.js';

export default async (request, response, next) => {
  response.$body = [];
  const { period = 'weekly' } = request.query;
  let i = 5;
  const result = [];
  const today = dayjs().format('YYYY-MM-DD').toString();
  while (i >= 0) {
    result[i] = {};

    if (period === 'daily') {
      result[i].from = `${dayjs(today)
        .subtract(5 - i, 'day')
        .format('YYYY-MM-DD')
        .toString()} 00:00:00`;
      result[i].to = `${dayjs(today)
        .subtract(5 - i, 'day')
        .format('YYYY-MM-DD')
        .toString()} 23:59:59`;
    }
    if (period === 'weekly') {
      result[i].from = `${dayjs(today)
        .subtract(5 - i, 'week')
        .startOf('week')
        .format('YYYY-MM-DD')
        .toString()} 00:00:00`;
      result[i].to = `${dayjs(today)
        .subtract(5 - i, 'week')
        .endOf('week')
        .format('YYYY-MM-DD')
        .toString()} 23:59:59`;
    }
    if (period === 'monthly') {
      result[i].from = `${dayjs(today)
        .subtract(5 - i, 'month')
        .startOf('month')
        .format('YYYY-MM-DD')
        .toString()} 00:00:00`;
      result[i].to = `${dayjs(today)
        .subtract(5 - i, 'month')
        .endOf('month')
        .format('YYYY-MM-DD')
        .toString()} 23:59:59`;
    }
    i -= 1;
  }
  const results = await Promise.all(
    result.map(async (element) => {
      const query = select();
      query
        .from('order')
        .select('SUM (grand_total)', 'total')
        .select('COUNT (order_id)', 'count')
        .where('created_at', '>=', element.from)
        .and('created_at', '<=', element.to);
      query.limit(0, 1);
      const queryResult = await query.execute(pool);
      return {
        total: queryResult[0].total || 0,
        count: queryResult[0].count,
        time: dayjs(element.to).format('MMM DD').toString()
      };
    })
  );
  response.json(results);
};
