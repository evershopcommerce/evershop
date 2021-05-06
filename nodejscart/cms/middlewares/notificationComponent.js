const { getComponentSource } = require("../../../lib/util");

module.exports = function (request, response) {
    response.addComponent("notification", 'body', getComponentSource("notification.js", true), {}, 1);
}