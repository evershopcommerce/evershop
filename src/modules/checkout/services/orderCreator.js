import { pool } from "../../../lib/mysql/connection";
import { commit, getConnection, insert, rollback, select, startTransaction } from "@nodejscart/mysql-query-builder";

/* Default validation rules */
var validationServices = [
    {
        id: "checkEmpty",
        func: (cart, validationErrors) => {
            let items = cart.getItems();
            if (items.length == 0) {
                validationErrors.push("Cart is empty");
                return false;
            } else {
                return true;
            }
        }
    }
];
var validationErrors = [];

export async function createOrder(cart, eventDispatcher) {
    // Start creating order
    let connection = getConnection(pool);
    startTransaction(connection);

    try {
        for (const rule of validationServices) {
            if (await rule.func(cart, validationErrors) === false) {
                throw new Error(validationErrors);
            }
        }

        // Save the shipping address
        let shipAddr = await insert("order_address")
            .given(await select()
                .from("cart_address")
                .where("cart_address_id", "=", cart.getData("shipping_address_id"))
                .load()
            );

        // Save the billing address
        let billAddr = await insert("order_address")
            .given(await select()
                .from("cart_address")
                .where("cart_address_id", "=", cart.getData("billing_address_id"))
                .load()
            );
        // Save order to DB
        // TODO: Maybe we should allow plugin to prepare order data before created?
        let order = await insert("order").given({ ...cart.getData(), shipping_address_id: shipAddr.insertId, billing_address_id: billAddr.insertId });

        // Save order items
        let items = cart.getItems();
        await Promise.all(items.map(async (item) => {
            await insert("order_item").given(item.getData().concat("order_id", order.insertId));
        }));

        // Save order activities
        await insert("order_activity").given({
            'order_activity_order_id': order.insertId,
            'comment': 'Order created',
            'customer_notified': 0 //TODO: check config of SendGrid
        });

        commit(connection);
    } catch (e) {
        rollback(connection);
        throw e;
    }
}

export function addCreateOrderValidationRule(id, func) {
    if (typeof obj != 'function')
        throw new Error("Validator must be a function");

    validationServices.push({ id, func });
}

export function removeCreateOrderValidationRule(id) {
    validationServices = validationServices.filter(r => r.id !== id);
}

