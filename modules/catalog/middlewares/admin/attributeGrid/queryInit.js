var { select } = require('@nodejscart/mysql-query-builder');

module.exports = function (request, response) {
    let query = select("*").from("attribute");

    return query;
}