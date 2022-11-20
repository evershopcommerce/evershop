import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Toggle } from '../../../../../lib/components/form/fields/Toggle';
import { Card } from '../../../../cms/components/admin/Card';

export default function StripePayment({ setting: { stripePaymentStatus, stripeDislayName, stripePublishableKey, stripeSecretKey } }) {
  return <Card
    title={"Stripe Payment"}
  >
    <Card.Session >
      <div className='grid grid-cols-3 gap-2'>
        <div className='col-span-1 items-center flex'>
          <h4>Enable?</h4>
        </div>
        <div className='col-span-2'>
          <Toggle
            name="stripePaymentStatus"
            value={stripePaymentStatus}
          />
        </div>
      </div>
    </Card.Session>
    <Card.Session >
      <div className='grid grid-cols-3 gap-2'>
        <div className='col-span-1 items-center flex'>
          <h4>Dislay Name</h4>
        </div>
        <div className='col-span-2'>
          <Field
            type="text"
            name="stripeDislayName"
            placeholder="Dislay Name"
            value={stripeDislayName}
          />
        </div>
      </div>
    </Card.Session>
    <Card.Session >
      <div className='grid grid-cols-3 gap-2'>
        <div className='col-span-1 items-center flex'>
          <h4>Publishable Key</h4>
        </div>
        <div className='col-span-2'>
          <Field
            type="text"
            name="stripePublishableKey"
            placeholder="Publishable Key"
            value={stripePublishableKey}
          />
        </div>
      </div>
    </Card.Session>
    <Card.Session >
      <div className='grid grid-cols-3 gap-2'>
        <div className='col-span-1 items-center flex'>
          <h4>Secret Key</h4>
        </div>
        <div className='col-span-2'>
          <Field
            type="text"
            name="stripeSecretKey"
            placeholder="Secret Key"
            value={stripeSecretKey}
          />
        </div>
      </div>
    </Card.Session>
  </Card>;
}

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 10
}

export const query = `
  query Query {
    setting {
      stripeDislayName
      stripePaymentStatus
      stripePublishableKey
      stripeSecretKey
    }
  }
`;