import Area from '@components/common/Area.js';
import React from 'react';

/**
 * Account dashboard shell. It owns the centered column and the slots (Areas);
 * the content is page blocks registering into those slots, so a theme can
 * re-position them from `layouts.json` without overriding this file:
 *
 *   account+orderList/AccountHeader  → accountPageHeader  10  (shared with the order list)
 *   account+orderList/AccountNav     → accountPageHeader  20  (shared with the order list)
 *   account/AccountRecentOrders      → accountPageContent 10
 *   account/AccountInfo              → accountPageContent 20
 *   account/AccountAddressBook       → accountPageContent 30
 */
export default function MyAccount() {
  return (
    <div className="account mx-auto max-w-2xl py-10">
      <Area id="accountPageHeader" noOuter />
      <div className="mt-2 divide-y divide-border">
        <Area id="accountPageContent" noOuter />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
