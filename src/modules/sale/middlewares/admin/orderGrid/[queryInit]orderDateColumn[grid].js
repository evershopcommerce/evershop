const { assign } = require("../../../../../lib/util/assign");
const { DateTime } = require("luxon");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["created_at"] !== undefined) {
        let query = stack["queryInit"];
        let ranges = request.query["created_at"].split("-");
        let from = DateTime.fromFormat(ranges[0], 'D').isValid ? DateTime.fromFormat(ranges[0], 'D').toFormat("yyyy-MM-dd").toString() : null;
        let to = DateTime.fromFormat(ranges[1], 'D').isValid ? DateTime.fromFormat(ranges[1], 'D').toFormat("yyyy-MM-dd").toString() : null;
        if (from) {
            query.andWhere("`order`.`created_at`", ">=", from);
            assign(response.context, { grid: { currentFilter: { created_at: { from: from } } } });
        }
        if (to) {
            query.andWhere("`order`.`created_at`", "<=", to);
            assign(response.context, { grid: { currentFilter: { created_at: { to: to } } } });
        }
    }
}