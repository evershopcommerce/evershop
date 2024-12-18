import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useCheckoutSteps } from '@components/common/context/checkoutSteps';
import { useAppDispatch } from '@components/common/context/app';

const Checkout = React.createContext();
const CheckoutDispatch = React.createContext();
export function CheckoutProvider({
  children,
  cartId,
  placeOrderAPI,
  getPaymentMethodAPI,
  checkoutSuccessUrl
}) {
  const AppContextDispatch = useAppDispatch();
  const steps = useCheckoutSteps();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState();
  const [error, setError] = useState(null);

  // Call api to current url when steps change
  useEffect(() => {
    const reload = async () => {
      const url = new URL(window.location.href, window.location.origin);
      url.searchParams.append('ajax', true);
      await AppContextDispatch.fetchPageData(url);
      url.searchParams.delete('ajax');
      // await placeOrder();
    };
    reload();
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
      error,
      orderPlaced,
      orderId,
      paymentMethods,
      setPaymentMethods,
      getPaymentMethods,
      checkoutSuccessUrl
    }),
    [
      steps,
      cartId,
      error,
      orderPlaced,
      orderId,
      paymentMethods,
      checkoutSuccessUrl
    ]
  );

  const placeOrder = async () => {
    try {
      setError(null);
      const response = await axios.post(placeOrderAPI, { cart_id: cartId });
      setOrderPlaced(true);
      setOrderId(response.data.data.uuid);
      return response.data.data;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  const dispatchMethods = useMemo(() => ({ placeOrder, setError }), []);
  return (
    <CheckoutDispatch.Provider value={dispatchMethods}>
      <Checkout.Provider value={contextValue}>{children}</Checkout.Provider>
    </CheckoutDispatch.Provider>
  );
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
export const useCheckoutDispatch = () => React.useContext(CheckoutDispatch);
