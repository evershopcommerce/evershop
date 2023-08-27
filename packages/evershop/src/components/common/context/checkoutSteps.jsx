import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';

const Steps = React.createContext();
const CheckoutStepsDispatch = React.createContext();

export function CheckoutSteps({ children, value }) {
  const [steps, setSteps] = useState(value);

  const canStepDisplay = (step) => {
    const checkoutSteps = [...steps].sort(
      (a, b) => parseInt(a.sortOrder, 10) - parseInt(b.sortOrder, 10)
    );
    const index = checkoutSteps.findIndex((s) => s.id === step.id);

    // check if all previous step is completed
    if (!checkoutSteps.slice(0, index).every((s) => s.isCompleted === true))
      return false;
    if (index === steps.length - 1) return true; // last step
    if (step.isCompleted !== true) return true; // completed step
    return false;
  };

  /**
   * Add a step to the checkout steps
   * @param {Object} step { id, title, isCompleted, sortOrder, editable }}
   */
  const addStep = (step) => {
    setSteps((previous) => previous.concat([step]));
  };

  const editStep = (stepId) => {
    const index = steps.findIndex((s) => s.id === stepId);
    setSteps(
      steps.map((s, i) => {
        if (s.id === stepId) {
          return {
            ...s,
            isCompleted: false
          };
        } else if (i > index) {
          return {
            ...s,
            isCompleted: false
          };
        } else return s;
      })
    );
  };

  const completeStep = (stepId, preview) => {
    setSteps(
      steps.map((s) => {
        if (s.id === stepId) {
          return {
            ...s,
            isCompleted: true,
            isEditing: false,
            preview
          };
        } else return s;
      })
    );
  };

  const contextDispatchValue = useMemo(
    () => ({
      canStepDisplay,
      editStep,
      completeStep,
      addStep
    }),
    [steps]
  );

  return (
    <Steps.Provider value={steps}>
      <CheckoutStepsDispatch.Provider value={contextDispatchValue}>
        {children}
      </CheckoutStepsDispatch.Provider>
    </Steps.Provider>
  );
}

CheckoutSteps.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  value: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      isCompleted: PropTypes.bool,
      sortOrder: PropTypes.number,
      editable: PropTypes.bool
    })
  ).isRequired
};

export const useCheckoutSteps = () => React.useContext(Steps);
export const useCheckoutStepsDispatch = () =>
  React.useContext(CheckoutStepsDispatch);
