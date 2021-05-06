const { getComponentSource } = require("../../../../../lib/util");

module.exports = (request, response) => {
    response.addComponent("layout", "content", getComponentSource("cms/components/admin/dashboard/layout.js"), {}, 2);
}