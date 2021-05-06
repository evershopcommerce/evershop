const { getComponentSource } = require("../../../../../lib/util")

module.exports = function (request, response) {
    response.addComponent("metaTitle", 'head', getComponentSource("cms/components/site/metaTitle.js", true), {}, 1);
    response.addComponent("metaDescription", 'head', getComponentSource("cms/components/site/metaDescription.js", true), {}, 1);
}