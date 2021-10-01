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
    const [orderId, setOrderId] = useState();
    const [error, setError] = useState(null);

    useEffect(() => {
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
                setOrderId(response.data.data.orderId);
                setError(null);
                //let redirectUrl = response.data.data.redirect || checkoutSuccessUrl;

                //window.location.href = redirectUrl;
            } else {
                setError(response.data.message);
            }
        }
        placeOrder();
    }, [steps])

    return (
        <Checkout.Provider value={{ steps, orderPlaced, orderId }}>
            {children}
        </Checkout.Provider>
    )
}

export const useCheckout = () => React.useContext(Checkout)
