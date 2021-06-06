const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    let cart = await stack["initCart"];
    let items = cart.getItems();

    if (items.length === 0 || cart.hasError()) {
        response.redirect(302, buildSiteUrl("cart"));
    }
};