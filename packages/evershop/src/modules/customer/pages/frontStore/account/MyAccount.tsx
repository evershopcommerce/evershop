import Area from '@components/common/Area.js';
import { AccountHeader } from '@components/frontStore/customer/AccountHeader.js';
import AccountInfo from '@components/frontStore/customer/AccountInfo.js';
import { AccountNav } from '@components/frontStore/customer/AccountNav.js';
import { MyAddresses } from '@components/frontStore/customer/MyAddresses.js';
import OrderHistory from '@components/frontStore/customer/OrderHistory.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function MyAccount() {
  return (
    <div className="account mx-auto max-w-2xl py-10">
      <AccountHeader />
      <AccountNav active="dashboard" />
      <div className="mt-2 divide-y divide-border">
        <section className="account-recent-orders py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h5">{_('Recent orders')}</h2>
            <a
              href="/account/orders"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {_('View all')}
            </a>
          </div>
          <OrderHistory />
        </section>
        <section className="account-info-section py-6">
          <h2 className="mb-4 h5">{_('Account information')}</h2>
          <AccountInfo />
        </section>
        <section className="account-address-section py-6">
          <h2 className="mb-4 h5">{_('Address book')}</h2>
          <MyAddresses />
          <Area id="accountPageAddressBook" noOuter />
        </section>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
