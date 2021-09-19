import { get } from "../../lib/util/get";
import React, { useState } from "react";

const Steps = React.createContext();
const CheckoutStepsDispatch = React.createContext();

export const CheckoutSteps = ({ children }) => {
    const [steps, setSteps] = useState(typeof window !== 'undefined' ? get(window, 'appContext.checkout.steps', []) : []);// TODO: Consider using ajax to load steps

    const canStepDisplay = (step) => {
        let _steps = [...steps].sort((a, b) => parseInt(a.sortOrder) - parseInt(b.sortOrder));
        let index = _steps.findIndex(s => s.id === step.id);
        if (step.isEditing === true) {
            return true;
        }

        if (step.isCompleted === true && index === steps.length - 1)
            return true;
        if (step.isCompleted === true || steps.findIndex(s => s.isEditing === true) !== -1) {
            return false;
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

    const editStep = (step) => {
        setSteps(steps.map(s => {
            if (s.id === step)
                return { ...s, isEditing: true }
            else
                return s;
        }))
    }

    const completeStep = (step) => {
        setSteps(steps.map(s => {
            if (s.id === step)
                return { ...s, isCompleted: true, isEditing: false }
            else
                return s;
        }))
    }

    return (
        <Steps.Provider value={steps}>
            <CheckoutStepsDispatch.Provider value={{ canStepDisplay, editStep, completeStep }}>
                {children}
            </CheckoutStepsDispatch.Provider>
        </Steps.Provider>
    )
}

export const useCheckoutSteps = () => React.useContext(Steps)
export const useCheckoutStepsDispatch = () => React.useContext(CheckoutStepsDispatch)
