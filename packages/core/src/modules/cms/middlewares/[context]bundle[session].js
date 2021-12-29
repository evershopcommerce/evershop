const bundlee = require("../../../lib/bundlee");

module.exports = async function (request, response) {
    let route = request._route;

    await bundlee(request, response, route);
};