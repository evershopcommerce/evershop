import AccountInfo from '@components/frontStore/customer/AccountInfo.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Account dashboard block: the account information section (name, email,
 * edit form). A page component rather than markup inside the `MyAccount`
 * shell so a theme can move it from `layouts.json`.
 */
export default function AccountInfoBlock(): React.ReactElement {
  return (
    <section className="account-info-section py-6">
      <h2 className="mb-4 h5">{_('Account information')}</h2>
      <AccountInfo />
    </section>
  );
}

export const layout = {
  areaId: 'accountPageContent',
  sortOrder: 20
};
