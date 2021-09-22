const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = (request, response, stack, next) => {
    if (!request.session.orderId) {
        response.redirect(302, buildSiteUrl("homepage"));
    } else {
        // TODO: Load order
        next();
    }
};