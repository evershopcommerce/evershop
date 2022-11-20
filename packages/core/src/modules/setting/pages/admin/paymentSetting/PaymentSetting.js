import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Form } from '../../../../../lib/components/form/Form';
import SettingMenu from '../../../components/SettingMenu';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get';

export default function PaymentSetting({ saveSettingApi }) {
  const onSuccess = (response) => {
    if (response.success) {
      window.location.reload();
    } else {
      toast.error(get(response, 'message', 'Something wrong. Please reload the page!'));
    }
  }

  return <div className='main-content-inner'>
    <div className='grid grid-cols-6 gap-x-2 grid-flow-row '>
      <div className='col-span-2'>
        <SettingMenu />
      </div>
      <div className='col-span-4'>
        <Form
          id='PaymentSettingForm'
          method="POST"
          action={saveSettingApi}
          onSuccess={onSuccess}
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