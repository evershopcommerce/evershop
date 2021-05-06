const util = require("util");
import { getConnection, commit, rollback, startTransaction } from "../../../../../lib/mysql/connection";
import { del, insert, update } from "../../../../../lib/mysql/query";
import { assign } from "../../../../../lib/util/assign";

module.exports = async (request, response, stack, next) => {
    const connection = await getConnection();
    await startTransaction(connection);
    try {
        let cart = await stack["initCart"];
        let items = cart.getItems();
        if (items.length === 0) {
            // Delete cart if existed
            if (cart.getData("cart_id")) {
                await del("cart")
                    .where("cart_id", "=", cart.getData("cart_id"))
                    .execute(connection);
                request.session.cartId = undefined;
            }
            await commit(connection);
            return next();
        } else {
            if (cart.getData("cart_id")) {
                await update("cart")
                    .given(cart.export())
                    .where("cart_id", "=", cart.getData("cart_id"))
                    .execute(connection);
            } else {
                let c = await insert("cart")
                    .given(cart.export())
                    .execute(connection);
                // Store cartId to session
                request.session.cartId = c.insertId;
            }

            await Promise.all(items.map(async (item) => {
                if (item.getData("cart_item_id")) {
                    await update("cart_item")
                        .given(item.export())
                        .where("cart_item_id", "=", item.getData("cart_item_id"))
                        .execute(connection);
                } else {
                    await insert("cart_item")
                        .given({ ...item.export(), cart_id: cart.getData("cart_id") ?? request.session.cartId })
                        .execute(connection);
                }
            }));

            await commit(connection);
            // Assign cart information to context
            let cartInfo = cart.export();
            cartInfo.items = items.map((item) => item.export());
            assign(response.context, { cart: cartInfo });

            next();
        }
    } catch (error) {
        await rollback(connection);
        next(error);
    }
}