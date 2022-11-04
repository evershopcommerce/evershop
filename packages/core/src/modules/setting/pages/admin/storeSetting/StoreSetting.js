import React from 'react';
import { Card } from '../../../../cms/components/admin/Card';
import SettingMenu from '../../../components/SettingMenu';

export default function StoreSetting() {
  return <div>
    <div className='row'>
      <div className='col-3'>
        <SettingMenu />
      </div>
      <div className='col-9'>
        <Card
          title="Menu"

        >
          <h1>Payment Setting</h1>

        </Card>
      </div>
    </div>
  </div>;
}