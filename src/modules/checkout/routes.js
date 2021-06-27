module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerSiteRoute("cart", ["GET"], "/cart/");


    registerSiteRoute("addToCart", ["POST"], "/cart/add/");

    registerSiteRoute("cartItemRemove", ["GET"], " / cart/item/remove/:id");

    registerSiteRoute("cartEmpty", ["GET"], "/cart/empty");

    registerSiteRoute("checkout", ["GET"], "/checkout/");

    registerSiteRoute("checkoutSetContactInfo", ["POST"], "/checkout/setContactInfo");

    registerSiteRoute("checkoutSetShippingAddress", ["POST"], "/checkout/setShippingAddress");

    registerSiteRoute("checkoutSetBillingAddress", ["POST"], "/checkout/setBillingAddress");
}