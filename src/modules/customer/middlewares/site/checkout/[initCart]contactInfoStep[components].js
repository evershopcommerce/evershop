const config = require("config");
const { getComponentSource } = require("../../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    // Contact info block
    response.addComponent(
        "customerIsdfsdfnfoStep",
        "checkoutSteps",
        getComponentSource("customer/components/site/checkout/customerInfoStep.js"),
        {
            setContactInfoUrl: buildSiteUrl("checkoutSetContactInfo"),
            loginUrl: buildSiteUrl("customerLoginPost")
        },
        5
    );
    let cart = await stack["initCart"];
    let step = { id: "contact", title: "Contact info", isCompleted: false, sortOrder: 5 };
    if (cart.getData("customer_email"))
        step.isCompleted = true;
    response.context.checkoutSteps = response.context.checkoutSteps || [];
    response.context.checkoutSteps.push(step);
};