module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerSiteRoute("cart", ["GET"], "/cart/");

    registerSiteRoute("checkout", ["GET"], "/checkout/");

    registerSiteRoute("addToCart", ["POST"], "/cart/add/");

    registerSiteRoute("cartItemRemove", ["GET"], " / cart/item/remove/:id");

    registerSiteRoute("cartEmpty", ["GET"], "/cart/empty");
}