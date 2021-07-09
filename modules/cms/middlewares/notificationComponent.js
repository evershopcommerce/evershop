const { getComponentSource } = require("../../../lib/helpers");

module.exports = function (request, response) {
    response.addComponent("notification", 'body', getComponentSource("notification.js", true), {}, 1);
}