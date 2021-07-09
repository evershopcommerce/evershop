const { getComponentSource } = require("../../../../../lib/helpers")

module.exports = function (request, response) {
    response.addComponent("bundle", 'after.body', getComponentSource("cms/components/bundle.js", true), {}, 10);
}