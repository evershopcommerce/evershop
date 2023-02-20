import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useCheckoutSteps } from '@components/common/context/checkoutSteps';

const Checkout = React.createContext();

export function CheckoutProvider({
  children,
  cartId,
  placeOrderAPI,
  getPaymentMethodAPI,
  checkoutSuccessUrl
}) {
  const steps = useCheckoutSteps();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState();
  const [, setError] = useState(null);

  useEffect(() => {
    const placeOrder = async () => {
      // If order is placed, do nothing
      if (orderPlaced) return;
      // If there is a incompleted step, do nothing
      if (
        steps.length < 1 ||
        steps.findIndex((s) => s.isCompleted === false) !== -1
      )
        return;
      const response = await axios.post(placeOrderAPI, { cart_id: cartId });
      if (!response.data.error) {
        setOrderPlaced(true);
        setOrderId(response.data.data.uuid);
        setError(null);
        // let redirectUrl = response.data.data.redirect || checkoutSuccessUrl;

        // window.location.href = redirectUrl;
      } else {
        setError(response.data.error.message);
      }
    };
    placeOrder();
  }, [steps]);

  const getPaymentMethods = async () => {
    const response = await axios.get(getPaymentMethodAPI);

    if (!response.data.error) {
      setPaymentMethods(response.data.data.methods);
    } else {
      setPaymentMethods([]);
    }
  };

  const contextValue = useMemo(
    () => ({
      steps,
      cartId,
      orderPlaced,
      orderId,
      paymentMethods,
      setPaymentMethods,
      getPaymentMethods,
      checkoutSuccessUrl
    }),
    [steps, cartId, orderPlaced, orderId, paymentMethods, checkoutSuccessUrl]
  );

  return <Checkout.Provider value={contextValue}>{children}</Checkout.Provider>;
}

CheckoutProvider.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  cartId: PropTypes.string.isRequired,
  placeOrderAPI: PropTypes.string.isRequired,
  getPaymentMethodAPI: PropTypes.string.isRequired,
  checkoutSuccessUrl: PropTypes.string.isRequired
};

export const useCheckout = () => React.useContext(Checkout);
