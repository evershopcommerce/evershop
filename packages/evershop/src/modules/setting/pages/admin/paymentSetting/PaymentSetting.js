import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Form } from '../../../../../lib/components/form/Form';
import SettingMenu from '../../../components/SettingMenu';
import { toast } from 'react-toastify';

export default function PaymentSetting({ saveSettingApi }) {
  return <div className='main-content-inner'>
    <div className='grid grid-cols-6 gap-x-2 grid-flow-row '>
      <div className='col-span-2'>
        <SettingMenu />
      </div>
      <div className='col-span-4'>
        <Form
          id='paymentSettingForm'
          method="POST"
          action={saveSettingApi}
          onSuccess={(response) => {
            if (response?.success === true) {
              toast.success('Setting saved');
            }
          }}
        >
          <Area
            id="paymentSetting"
            noOuter={true}
          />
        </Form>
      </div>
    </div>
  </div>;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
  }
`