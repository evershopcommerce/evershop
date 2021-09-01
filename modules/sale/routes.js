module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerAdminRoute("orderGrid", ["GET"], "/orders");
    registerAdminRoute("orderEdit", ["GET"], "/order/edit/:id(\\d+)");
    registerAdminRoute("salestatistic", ["POST"], "/salestatistic/:period");
    registerAdminRoute("createShipment", ["POST"], "/fullfill/:orderId(\\d+)");
}