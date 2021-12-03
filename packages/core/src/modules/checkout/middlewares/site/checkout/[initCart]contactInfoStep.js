const { buildSiteUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {

    let cart = await stack["initCart"];
    let step = { id: "contact", title: "Contact info", isCompleted: false, sortOrder: 5 };
    if (cart.getData("customer_email"))
        step.isCompleted = true;

    assign(response.context, { checkout: { steps: [step], setContactInfo: buildSiteUrl("checkoutSetContactInfo") } })
};