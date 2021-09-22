const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack, next) => {
    // if (!request.session.orderId) {
    //     response.redirect(302, buildSiteUrl("homepage"));
    // } else {
    //     // TODO: Load order
    //     request.session.orderId = undefined;
    //     next();
    // }
    next();
};