import Area from '@components/common/Area.js';
import { MyAddresses } from '@components/frontStore/customer/MyAddresses.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Account dashboard block: the address book section with the
 * `accountPageAddressBook` Area. A page component rather than markup inside
 * the `MyAccount` shell so a theme can move it from `layouts.json`.
 */
export default function AccountAddressBook(): React.ReactElement {
  return (
    <section className="account-address-section py-6">
      <h2 className="mb-4 h5">{_('Address book')}</h2>
      <MyAddresses />
      <Area id="accountPageAddressBook" noOuter />
    </section>
  );
}

export const layout = {
  areaId: 'accountPageContent',
  sortOrder: 30
};
