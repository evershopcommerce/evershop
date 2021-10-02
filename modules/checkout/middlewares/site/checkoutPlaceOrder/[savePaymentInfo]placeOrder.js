const { createOrder } = require("../../../services/orderCreator");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack, next) => {
    try {
        let cart = await stack["initCart"];
        await stack["savePaymentInfo"];
        // 
        let orderId = await createOrder(cart);

        request.session.orderId = orderId;
        console.log(request.session.orderId);
        response.json({
            data: {
                orderId: orderId
            },
            success: true,
            message: ""
        });
    } catch (e) {
        console.log(e);
        response.json({
            data: {},
            success: false,
            message: e.message
        });
    }
};