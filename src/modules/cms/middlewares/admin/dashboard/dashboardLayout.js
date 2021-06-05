const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = (request, response) => {
    response.addComponent("layout", "content", getComponentSource("cms/components/admin/dashboard/layout.js"), {}, 2);
}