const { select } = require("@nodejscart/mysql-query-builder");
const { getComponentSource } = require("../../../../lib/helpers");
const { pool } = require('../../../../lib/mysql/connection');
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "abc",
            areaId: "body",
            source: getComponentSource('catalog/components/hello.js'),
            props: {

            },
            sortOrder: 10
        },
        {
            id: "cde",
            areaId: "body",
            source: getComponentSource('catalog/components/hello.js'),
            props: {

            },
            sortOrder: 10
        }
    ],
    "*-productView": [

    ],
    "productEdit+productView": [

    ],
    categoryView: [
        {
            id: "",
            areaId: "body",
            source: getComponentSource('catalog/components/hello.js'),
            props: {

            },
            sortOrder: 10
        }
    ],
}