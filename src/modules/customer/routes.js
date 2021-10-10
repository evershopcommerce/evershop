module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerSiteRoute("customerLoginPost", ["POST"], "/customer/loginPost");
}