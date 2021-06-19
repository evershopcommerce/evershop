import React from "react";

const CheckoutContext = React.createContext();

export const CheckoutProvider = ({ children }) => {
    const value = {
        getShippingAddress: async () => {

        },
        setShippingAddress: async () => {

        },
        getBillingAddress: async () => {

        },
        setBillingAddress: async () => {

        },
        getShippingMethods: async () => {

        },
        getPaymentMethods: async () => {

        }
    };
    return (
        <CheckoutContext.Provider value={value}>
            {children}
        </CheckoutContext.Provider>
    )
}

export const useCheckout = () => React.useContext(CheckoutContext)
