const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = (request, response, stack, next) => {
    response.redirect(301, buildSiteUrl("homepage"))
}