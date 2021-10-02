module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerSiteRoute("createPaymentIntent", ["POST"], "/stripe/create-payment-intent");
    registerSiteRoute("stripeWebHook", ["POST"], "/stripe/webhook");
}