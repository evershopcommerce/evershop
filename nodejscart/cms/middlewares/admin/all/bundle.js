const { getComponentSource } = require("../../../../../lib/util")

module.exports = function (request, response) {
    response.addComponent("bundle", 'after.body', getComponentSource("cms/components/bundle.js", true), {}, 10);
}