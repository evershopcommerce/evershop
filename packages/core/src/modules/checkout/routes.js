module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerSiteRoute("cart", ["GET"], "/cart/");

    registerSiteRoute("addToCart", ["POST"], "/cart/add/");

    registerSiteRoute("cartItemRemove", ["GET", "POST"], "/cart/item/remove/:id");

    registerSiteRoute("cartEmpty", ["GET", "POST"], "/cart/empty");

    registerSiteRoute("checkout", ["GET"], "/checkout/");

    registerSiteRoute("checkoutGetShippingMethods", ["POST"], "/checkout/getShippingMethods");

    registerSiteRoute("checkoutGetPaymentMethods", ["POST"], "/checkout/getPaymentMethods");

    registerSiteRoute("checkoutSetContactInfo", ["POST"], "/checkout/setContactInfo");

    registerSiteRoute("checkoutSetShipmentInfo", ["POST"], "/checkout/setShipmentInfo");

    registerSiteRoute("checkoutSetBillingAddressInfo", ["POST"], "/checkout/setBillingAddressInfo");

    registerSiteRoute("checkoutSetPaymentInfo", ["POST"], "/checkout/setPaymentInfo");

    registerSiteRoute("checkoutPlaceOrder", ["POST"], "/checkout/placeOrder");

    registerSiteRoute("checkoutSuccess", ["GET"], "/checkout/success");
}