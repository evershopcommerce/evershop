var { select } = require('@nodejscart/mysql-query-builder');

module.exports = function (request, response) {
    let query = select("*").from("order");

    return query;
}