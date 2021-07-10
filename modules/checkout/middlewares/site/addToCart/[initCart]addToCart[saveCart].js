module.exports = async (request, response, stack, next) => {
    try {
        let cart = await stack["initCart"];
        let productId = parseInt(`0${request.body.product_id}`);
        let qty = parseInt(`0${request.body.qty}`);

        if (qty < 1)
            throw "Invalid quantity";
        let item = await cart.addItem({ product_id: productId, qty: qty });
        // Extract cart info
        let cartInfo = cart.export();
        let items = cart.getItems();
        cartInfo.items = items.map((item) => item.export());

        response.$body = {
            data: { cart: cartInfo },
            success: true,
            message: "Product was added to cart successfully"
        };
    } catch (error) {
        response.$body = {
            data: {},
            success: false,
            message: error.message
        };
    }
    next();
}