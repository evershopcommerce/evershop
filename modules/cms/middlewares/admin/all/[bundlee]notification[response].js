const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = function (request, response) {
    console.log(request._route.id);
    console.log(request.session);
    response.context.notifications = [...request.session.notifications || []];
    request.session.notifications = [];
}