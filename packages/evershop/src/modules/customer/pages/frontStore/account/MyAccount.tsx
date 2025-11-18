import Area from '@components/common/Area.js';
import AccountInfo from '@components/frontStore/customer/AccountInfo.js';
import { MyAddresses } from '@components/frontStore/customer/MyAddresses.js';
import OrderHistory from '@components/frontStore/customer/OrderHistory.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function MyAccount() {
  return (
    <div>
      <h1 className="text-center">{_('My Account')}</h1>
      <div className="page-width mt-7 grid grid-cols-1 md:grid-cols-3 gap-7">
        <div className="col-span-1 md:col-span-2">
          <OrderHistory title={_('Recent Orders')} />
        </div>
        <div className="col-span-1">
          <AccountInfo title={_('Account Information')} showLogout />
        </div>
      </div>
      <div className="page-width mt-7">
        <MyAddresses title={_('Address Book')} />
        <Area id="accountPageAddressBook" noOuter />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
