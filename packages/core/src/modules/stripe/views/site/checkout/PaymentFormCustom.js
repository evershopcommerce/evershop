import React from 'react';
import Button from '../../../../../lib/components/form/Button';
import { Field } from '../../../../../lib/components/form/Field';
import { useFormContext } from '../../../../../lib/components/form/Form';

export default function StripePaymentForm() {
  const formContext = useFormContext();

  const testSuccess = () => {
    formContext.updateField('card_number', '4242 4242 4242 4242');
    formContext.updateField('card_holder', 'David');
    formContext.updateField('card_expiration', '12/2030');
    formContext.updateField('card_cvv', '123');
  };

  const testFailure = () => {
    formContext.updateField('card_number', '4000 0000 0000 0002');
    formContext.updateField('card_holder', 'David');
    formContext.updateField('card_expiration', '12/2030');
    formContext.updateField('card_cvv', '123');
  };

  return (
    <div className="stripe-form">
      <div className="stripe-form-heading flex justify-between">
        <div className="self-center">Credit card</div>
        <div className="self-center flex space-x-1">
          <Button onAction={testSuccess} title="Test success" outline variant="interactive" />
          <Button onAction={testFailure} title="Test failure" variant="critical" outline />
        </div>
      </div>
      <div className="stripe-form-body">
        <Field
          type="text"
          name="card_number"
          placeholder="Card number"
          suffix={(
            <svg style={{ width: '2rem', height: '2rem' }} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="#6d7175">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
          validationRules={['notEmpty']}
        />
        <Field
          type="text"
          name="card_holder"
          placeholder="Name on the card"
          validationRules={['notEmpty']}
        />
        <div className="grid grid-cols-2 gap-1 mt-1">
          <div>
            <Field
              type="text"
              name="card_expiration"
              placeholder="Expiration date (MM/YY)"
              validationRules={['notEmpty']}
            />
          </div>
          <div>
            <Field
              type="text"
              name="card_cvv"
              placeholder="Security code"
              validationRules={['notEmpty']}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
