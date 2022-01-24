const { Cart } = require("../../../services/cart");
const { pool } = require("../../../../../lib/mysql/connection");
const { select } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response, stack) => {
    let cart;
    // Check if there is a cart id in session
    if (request.session.cartId) {
        // Check status of the cart
        let c = await select().from("cart")
            .where("cart_id", "=", request.session.cartId)
            .and("status", "=", 1)
            .load(pool);
        if (c) {
            cart = new Cart(request, { ...c });
        } else {
            // Remove cartId from session
            request.session.cartId = undefined;
        }
    }
    if (!cart) // If there is no cart available, create a new cart object
        cart = new Cart(request);

    await cart.build();
    // let items = cart.getItems();
    // items.forEach(element => {
    //     console.log(element._fields);
    // });
    return cart;
}