import React from "react";

const CheckoutContext = React.createContext();

export const CheckoutProvider = ({ children }) => {
    const value = {
        steps: [
            "customer",
            "shipping",
            "billing"
        ],
        currentStep: undefined,
        getShippingAddress: () => {

        },
        setShippingAddress: () => {

        },
        getBillingAddress: () => {

        },
        setBillingAddress: () => {

        },
        getShippingMethods: () => {

        },
        getPaymentMethods: () => {

        }
    };
    return (
        <CheckoutContext.Provider value={value}>
            {children}
        </CheckoutContext.Provider>
    )
}

export const useCheckout = () => React.useContext(CheckoutContext)
