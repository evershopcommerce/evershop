module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerAdminRoute("orderGrid", ["GET"], "/orders");
    registerAdminRoute("orderEdit", ["GET"], "/order/edit/:id(\\d+)");
}