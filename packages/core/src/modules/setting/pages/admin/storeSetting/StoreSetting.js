import React from 'react';
import { Form } from '../../../../../lib/components/form/Form';
import { Card } from '../../../../cms/components/admin/Card';
import SettingMenu from '../../../components/SettingMenu';

export default function StoreSetting({ saveSettingApi }) {
  return <div className='main-content-inner'>
    <div className='grid grid-cols-6 gap-x-2 grid-flow-row '>
      <div className='col-span-2'>
        <SettingMenu />
      </div>
      <div className='col-span-4'>
        <Form
          method="POST"
          action={saveSettingApi}
        >
          <Card
            title={"Store details"}
          >
            <Card.Session title={"Store Information"}>

            </Card.Session>
          </Card>
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