import React, { useState, useEffect, useLayoutEffect } from "react";
import {
    CardElement,
    useStripe,
    useElements
} from "@stripe/react-stripe-js";
import { useCheckout } from "../../../../../lib/context/order";
import Button from "../../../../../lib/components/form/Button";
import { get } from "../../../../../lib/util/get";
import { useAppState } from "../../../../../lib/context/app";

export default function CheckoutForm() {
    const [succeeded, setSucceeded] = useState(false);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [disabled, setDisabled] = useState(true);
    const [clientSecret, setClientSecret] = useState('');
    const stripe = useStripe();
    const elements = useElements();

    const context = useAppState();
    const [billingCompleted, setBillingCompleted] = useState(false);
    const [paymentMethodCompleted, setPaymentMethodCompleted] = useState(false);
    const checkout = useCheckout();
    const [loading, setLoading] = useState(false);
    const billingAddress = get(context, 'cart.billingAddress', get(context, 'cart.shippingAddress', {}));

    useEffect(() => {
        // Create PaymentIntent as soon as the order is placed
        if (checkout.orderPlaced === true) {
            window
                .fetch("/stripe/create-payment-intent", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
                .then(res => {
                    return res.json();
                })
                .then(data => {
                    setClientSecret(data.clientSecret);
                });
        }
    }, [checkout.orderPlaced]);

    const cardStyle = {
        style: {
            base: {
                color: "#32325d",
                fontFamily: 'Arial, sans-serif',
                fontSmoothing: "antialiased",
                fontSize: "16px",
                "::placeholder": {
                    color: "#32325d"
                }
            },
            invalid: {
                color: "#fa755a",
                iconColor: "#fa755a"
            }
        },
        hidePostalCode: true
    };

    const handleChange = async (event) => {
        // Listen for changes in the CardElement
        // and display any errors as the customer types their card details
        setDisabled(event.empty);
        setError(event.error ? event.error.message : "");
    };

    const handleSubmit = async ev => {
        ev.preventDefault();
        setLoading(true);
        const cardElement = elements.getElement('card');

        if (get(cardElement, "_implementation._complete") !== true) {
            setError(`Please complete the card information`);
            setLoading(false);
        } else {
            setError(null);
            if (!billingCompleted) {
                document.getElementById('checkout_billing_address_form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
            }
            if (!paymentMethodCompleted) {
                document.getElementById('checkoutPaymentMethods').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
            }
        }
    };

    useEffect(() => {
        const pay = async () => {
            const payload = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: billingAddress.full_name,
                        email: get(context, 'cart.customer_email'),
                        phone: billingAddress.telephone,
                        address: {
                            line1: billingAddress.address_1,
                            country: billingAddress.country,
                            state: billingAddress.province,
                            postal_code: billingAddress.postcode,
                            city: billingAddress.city
                        }
                    }
                }
            });

            if (payload.error) {
                setError(`Payment failed ${payload.error.message}`);
                setProcessing(false);
            } else {
                setError(null);
                setProcessing(false);
                setSucceeded(true);
                // Redirect to checkout success page
                window.location.href = context.checkout.checkoutSuccessUrl
            }
        }
        console.log(clientSecret);
        if (checkout.orderPlaced === true && clientSecret) {
            setLoading(false);
            if (processing !== true) {
                setProcessing(true);
                pay();
            }
        }
    }, [checkout.orderPlaced, clientSecret])

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <CardElement id="card-element" options={cardStyle} onChange={handleChange} />
            <Button
                onAction={
                    () => { document.getElementById("payment-form").dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) }
                }
                title="Place Order"
                isLoading={processing || loading}
            />
            {/* Show any error that happens when processing the payment */}
            {error && (
                <div className="card-error text-critical" role="alert">
                    {error}
                </div>
            )}
        </form>
    );
}
