var { select } = require('@nodejscart/mysql-query-builder');
var { pool } = require('../../../../../lib/mysql/connection');
var dayjs = require('dayjs');

module.exports = function SaleStatistic(request, response) {
    response.$body = [];
    let period = request.params.period;
    let i = 19;
    let result = [];
    while (i >= 0) {
        result[i] = {};

        if (period == "daily") {
            result[i]['from'] = dayjs().subtract(19 - i, 'day').format('YYYY-MM-DD').toString() + " 00:00:00";
            result[i]['to'] = dayjs().subtract(19 - i, 'day').format('YYYY-MM-DD').toString() + ' 23:59:59';
        }
        if (period == "weekly") {
            result[i]['from'] = dayjs().subtract(19 - i, 'week').startOf('YYYY-MM-DD').toString() + " 00:00:00";
            result[i]['to'] = dayjs().subtract(19 - i, 'week').endOf('week').format('YYYY-MM-DD').toString() + ' 23:59:59';
        }
        if (period == "monthly") {
            result[i]['from'] = dayjs().subtract(19 - i, 'month').startOf('month').format('YYYY-MM-DD').toString() + " 00:00:00";
            result[i]['to'] = dayjs().subtract(19 - i, 'month').endOf('month').format('YYYY-MM-DD').toString() + ' 23:59:59';
        }
        i--;
    }

    return Promise.all(result.map(element => {
        let promise = new Promise(async (resolve, reject) => {
            let query = select();
            query.from("order")
                .select("SUM (grand_total)", "total")
                .select("COUNT (order_id)", "count")
                .where("created_at", ">=", element.from)
                .and("created_at", "<=", element.to);
            query.limit(0, 1);
            try {
                let results = await query.execute(pool);
                resolve(results)
            } catch (error) {
                reject(error);
            }
        })

        return promise.then((results) => {
            response.$body.push({ total: results[0]["total"] || 0, count: results[0]["count"], time: element.to })
        })
    }));
}