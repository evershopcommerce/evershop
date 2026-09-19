import OrderHistory from '@components/frontStore/customer/OrderHistory.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Account dashboard block: the recent orders section. A page component rather
 * than markup inside the `MyAccount` shell so a theme can move it from
 * `layouts.json`.
 */
export default function AccountRecentOrders(): React.ReactElement {
  return (
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
  );
}

export const layout = {
  areaId: 'accountPageContent',
  sortOrder: 10
};
