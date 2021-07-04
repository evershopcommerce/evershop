import React from "react";

const CheckoutService = React.createContext();

export const CheckoutProvider = ({ children }) => {
    const [services] = React.useState({
        canStepDisplay: (step, steps) => {
            let _steps = [...steps].sort((a, b) => parseInt(a.sortOrder) - parseInt(b.sortOrder));
            let index = _steps.findIndex(s => s.id === step.id);
            if (step.isCompleted === true) {
                return true;
            } else {
                let flag = true;
                _steps.every(function (s, i) {
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
        }
    });

    return (
        <CheckoutService.Provider value={services}>
            {children}
        </CheckoutService.Provider>
    )
}

export const useCheckoutService = () => React.useContext(CheckoutService)
