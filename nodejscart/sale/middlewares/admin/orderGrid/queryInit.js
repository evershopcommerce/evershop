var { select } = require('../../../../../lib/mysql/query');

module.exports = function (request, response) {
    let query = select("*").from("order");

    return query;
}