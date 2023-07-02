import PropTypes from 'prop-types';
import React, { createContext, useMemo, useState } from 'react';

const Steps = createContext();
const CheckoutStepsDispatch = createContext();

export function CheckoutSteps({ children, value }) {
  const [steps, setSteps] = useState(value);

  const canStepDisplay = (step) => {
    const checkoutSteps = [...steps].sort(
      (a, b) => parseInt(a.sortOrder, 10) - parseInt(b.sortOrder, 10)
    );
    const index = checkoutSteps.findIndex((s) => s.id === step.id);

    let toRet = false;

    // check if all previous step is completed
    if (!checkoutSteps?.slice(0, index).every((s) => !!s?.isCompleted)) toRet = false;
    if (index === steps.length - 1 || !step.isCompleted) toRet = true // last step or completed step

    return toRet;
  };

  /**
   * Add a step to the checkout steps
   * @param {Object} step { id, title, isCompleted, sortOrder, editable }}
   */
  const addStep = (step) => {
    setSteps((previous) => previous.concat([step]));
  };

  const editStep = (stepId) => {
    const index = steps?.findIndex((step) => step.id === stepId);
    setSteps(
      steps.map((step, i) => step.id === stepId || i > index ? {...step, isCompleted: false} : step)
    );
  };

  const completeStep = (stepId, preview) => {
    setSteps(
      steps.map((step) => step.id === stepId ? {...step, isCompleted: true, isEditing: false, preview} : step)
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
