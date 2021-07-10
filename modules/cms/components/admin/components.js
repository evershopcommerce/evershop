const { select } = require("@nodejscart/mysql-query-builder");
const { getComponentSource } = require("../../../../lib/helpers");
const { pool } = require('../../../../lib/mysql/connection');
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "notification",
            areaId: "body",
            source: getComponentSource("notification.js", true),
            props: {},
            sortOrder: 1
        }
    ]
}