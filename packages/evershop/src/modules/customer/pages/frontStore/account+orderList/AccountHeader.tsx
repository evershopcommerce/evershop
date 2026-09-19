import { AccountHeader } from '@components/frontStore/customer/AccountHeader.js';
import React from 'react';

/**
 * Account pages block: the greeting header with the logout link, shared by the
 * dashboard and the order list (`account+orderList` folder). A page component
 * rather than markup inside the shells so a theme can move it from `layouts.json`.
 */
export default function AccountHeaderBlock(): React.ReactElement {
  return <AccountHeader />;
}

export const layout = {
  areaId: 'accountPageHeader',
  sortOrder: 10
};
