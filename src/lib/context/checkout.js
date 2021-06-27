import React from "react";
import { get } from "../util/get";
import { useAppState } from "./app";

const CheckoutService = React.createContext();
const CheckoutState = React.createContext();
const CheckoutStateDispatch = React.createContext()

export const CheckoutProvider = ({ children }) => {
    const appContext = useAppState();
    const [state, setState] = React.useState({
        steps: [...get(appContext, "checkoutSteps", [])].sort((a, b) => parseInt(a.sortOrder) - parseInt(b.sortOrder)),
        currentStep: undefined,
        error: []
    });

    const [services] = React.useState({
        canStepDisplay: (step, steps) => {
            let index = steps.findIndex(s => s.id === step.id)
            if (step.isCompleted === true) {
                return true;
            } else {
                let flag = true;
                steps.every(function (s, i) {
                    if (i >= index) {
                        return false;
                    } else {
                        if (s.isCompleted === false)
                            flag = false;
                        return true;
                    }
                })
                if (flag === true || index === 0)
                    return true;
                else
                    return false;
            }
        },
        getShippingAddress: async () => {

        },
        setShippingAddress: async () => {

        },
        getShippingMethods: async () => {

        },
        getBillingAddress: async () => {

        },
        setBillingAddress: async () => {

        },
        useShippingAddressAsBillingAddress: async () => {

        },
        getPaymentMethods: async () => {

        }
    });

    return (
        <CheckoutStateDispatch.Provider value={setState}>
            <CheckoutService.Provider value={services}>
                <CheckoutState.Provider value={state}>
                    {children}
                </CheckoutState.Provider>
            </CheckoutService.Provider>
        </CheckoutStateDispatch.Provider>
    )
}

export const useCheckoutService = () => React.useContext(CheckoutService)
export const useCheckoutState = () => React.useContext(CheckoutState)
export const useCheckoutStateDispatch = () => React.useContext(CheckoutStateDispatch)
