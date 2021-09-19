module.exports = async (request, response, stack, next) => {
    let body = request.body;
    let cart = await stack["initCart"];
    try {
        // Save payment method
        await cart.setData("payment_method", body.payment_method);
        response.$body = {
            data: {},
            success: true,
            message: ""
        };
        next();
    } catch (e) {
        console.log(e);
        response.json({
            data: {},
            success: false,
            message: e.message
        });
    }
};