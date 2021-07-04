const { buildSiteUrl } = require("../../../../../lib/routie");
import { assign } from '../../../../../lib/util/assign'

module.exports = async (request, response, stack) => {
    let cart = await stack["initCart"];
    let items = cart.getItems();

    if (items.length === 0 || cart.hasError()) {
        response.redirect(302, buildSiteUrl("cart"));
    } else {
        assign(response.context, { metaTitle: "Checkout", metaDescription: "Checkout" })
    }
};