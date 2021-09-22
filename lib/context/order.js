import { get } from "../../lib/util/get";
import React, { useEffect, useState } from "react";
import { useAppState } from "./app";
import axios from "axios";
import { useCheckoutSteps } from "./checkout";

const Checkout = React.createContext();

export const CheckoutProvider = ({ children }) => {
    const steps = useCheckoutSteps();
    const { checkout: { placeOrderAPI, checkoutSuccessUrl } } = useAppState();
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log(
            "order context", placeOrderAPI
        );
        const placeOrder = async () => {
            //If order is placed, do nothing
            if (orderPlaced)
                return;
            // If there is a incompleted step, do nothing
            if (steps.findIndex(s => s.isCompleted === false) !== -1)
                return

            let response = await axios.post(placeOrderAPI);
            if (response.data.success === true) {
                setOrderPlaced(true);
                setError(null);
                let redirectUrl = response.data.data.redirect || checkoutSuccessUrl;

                window.location.href = redirectUrl;
            } else {
                setError(response.data.message);
            }
        }
        placeOrder();
    }, [steps])

    return (
        <Checkout.Provider value={steps}>
            {children}
        </Checkout.Provider>
    )
}

export const useCheckout = () => React.useContext(Checkout)
