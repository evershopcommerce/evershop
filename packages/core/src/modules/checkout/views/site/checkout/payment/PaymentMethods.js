import axios from 'axios';
import React from 'react';
import Area from '../../../../../../lib/components/Area';

function Methods({ methods, selectedMethod, setSelectedMethod }) {
  return (
    <div>
      {/* <strong>Payment methods</strong>
        <Field
            type='radio'
            formId={"checkout_billing_address_form"}
            validationRules={["notEmpty"]}
            options={methods.map(m => { return { value: m.code, text: m.name } })}
            value={selectedMethod}
            name="payment_method"
        /> */}
    </div>
  );
}

export default function PaymentMethods({ getMethodsAPI }) {
  const [methods, setMethods] = React.useState([]);
  const [selectedMethod, setSelectedMethod] = React.useState(undefined);

  React.useEffect(() => {
    axios.post(getMethodsAPI).then((response) => setMethods(response.data.data.methods));
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
