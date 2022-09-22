import React from 'react';

export function Methods({ methods, selectedMethod, setSelectedMethod }) {
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
