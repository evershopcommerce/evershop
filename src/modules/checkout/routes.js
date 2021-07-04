module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerSiteRoute("cart", ["GET"], "/cart/");

    registerSiteRoute("addToCart", ["POST"], "/cart/add/");

    registerSiteRoute("cartItemRemove", ["GET"], " / cart/item/remove/:id");

    registerSiteRoute("cartEmpty", ["GET"], "/cart/empty");

    registerSiteRoute("checkout", ["GET"], "/checkout/");

    registerSiteRoute("checkoutGetShippingMethods", ["POST"], "/checkout/getShippingMethods");

    registerSiteRoute("checkoutGetPaymentMethods", ["POST"], "/checkout/getPaymentMethods");

    registerSiteRoute("checkoutSetContactInfo", ["POST"], "/checkout/setContactInfo");

    registerSiteRoute("checkoutSetShipmentInfo", ["POST"], "/checkout/setShipmentInfo");

    registerSiteRoute("checkoutSetPaymentInfo", ["POST"], "/checkout/setPaymentInfo");
    registerSiteRoute("checkoutPlaceOrderAPI", ["POST"], "/checkout/placeOrder");

    registerSiteRoute("checkoutSuccess", ["POST"], "/checkout/success");
}