const { insert, startTransaction, update, commit, rollback } = require("@nodejscart/mysql-query-builder");
const { getConnection } = require("../../../../../lib/mysql/connection");

const stripe = require("stripe")("sk_test_51Jdo9iEvEMCuLU1xZvrPhTSU4TsvSqRWyGorConYNrNFeSPxXdeJWZ5X1CNQ3dvruG56JvHIKOtD2D6oZGL0eHMR00cXfMu2hW");

// Webhook enpoint secret
// TODO: to be configured
const endpointSecret = 'whsec_pIiChJj8g5eihx1ZiG5nwogxVq7pX35Y';

module.exports = async (request, response, stack, next) => {
    const sig = request.headers['stripe-signature'];

    let event;
    let connection = await getConnection();
    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
        await startTransaction(connection);
        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                let orderId = paymentIntent.metadata.orderId;

                // Update the order
                // Create payment transaction
                await insert('payment_transaction')
                    .given({
                        amount: paymentIntent.amount,
                        payment_transaction_order_id: orderId,
                        transaction_id: paymentIntent.id,
                        transaction_type: "online",
                        payment_action: paymentIntent.capture_method === 'automatic' ? "Capture" : "Authorize"
                    })
                    .execute(connection);

                // Update the order status
                await update("order")
                    .given({ payment_status: "paid" })
                    .where('order_id', "=", orderId)
                    .execute(connection);

                // Add an activity log
                await insert("order_activity")
                    .given({
                        order_activity_order_id: orderId,
                        comment: `Customer paid by using credit card. Transaction ID: ${paymentIntent.id}`,
                        customer_notified: 0
                    })
                    .execute(connection);
                break;
            case 'payment_method.attached':
                const paymentMethod = event.data.object;
                console.log('PaymentMethod was attached to a Customer!');
                break;
            // ... handle other event types
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        await commit(connection);
        // Return a response to acknowledge receipt of the event
        response.json({ received: true });
    } catch (err) {
        console.log(err)
        await rollback(connection);
        response.status(400).send(`Webhook Error: ${err.message}`);
    }
}