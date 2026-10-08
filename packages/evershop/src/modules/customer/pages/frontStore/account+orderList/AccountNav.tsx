import { useAppState } from '@components/common/context/app.js';
import { AccountNav } from '@components/frontStore/customer/AccountNav.js';
import React from 'react';

/**
 * Account pages block: the Dashboard / Orders tabs, shared by the dashboard
 * and the order list (`account+orderList` folder). The active tab follows the
 * current route. A page component rather than markup inside the shells so a
 * theme can move it from `layouts.json`.
 */
export default function AccountNavBlock(): React.ReactElement {
  const routeId = useAppState()?.config?.pageMeta?.route?.id;
  return <AccountNav active={routeId === 'orderList' ? 'orders' : 'dashboard'} />;
}

export const layout = {
  areaId: 'accountPageHeader',
  sortOrder: 20
};
