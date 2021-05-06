const { getComponentSource } = require("../../../../../lib/util");

module.exports = (request, response) => {
    response.addComponent("title", "content", getComponentSource("cms/components/admin/title.js"), { "title": "Create new product" }, 1);
}