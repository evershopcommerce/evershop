import PropTypes from 'prop-types';
import axios from 'axios';
import React from 'react';
import Area from '@components/common/Area';
import { Methods } from '@components/frontStore/checkout/checkout/payment/paymentMethods/Methods';

export default function PaymentMethods({ getMethodsAPI }) {
  const [methods, setMethods] = React.useState([]);
  const [selectedMethod, setSelectedMethod] = React.useState(undefined);

  React.useEffect(() => {
    axios
      .post(getMethodsAPI)
      .then((response) => setMethods(response.data.data.methods));
  }, []);

  return (
    <Area
      id="checkoutPaymentMethods"
      className="checkout-payment-methods"
      selectedMethod={setSelectedMethod}
      coreComponents={[
        {
          component: { default: Methods },
          props: {
            methods,
            selectedMethod,
            setSelectedMethod
          },
          sortOrder: 0,
          id: 'paymentMethodsList'
        }
      ]}
    />
  );
}

PaymentMethods.propTypes = {
  getMethodsAPI: PropTypes.string.isRequired
};
