import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useQuery } from 'urql';

const CASHBACK_WIDGET_QUERY = `
  query CashbackWidgetQuery {
    currentCustomer {
      cashbackBalance {
        balance
        pendingBalance
      }
    }
  }
`;

export default function CashbackWidget() {
  const [result] = useQuery({ query: CASHBACK_WIDGET_QUERY });
  const { data } = result;

  const balance = data?.currentCustomer?.cashbackBalance?.balance ?? 0;
  const pendingBalance = data?.currentCustomer?.cashbackBalance?.pendingBalance ?? 0;

  return (
    <section className="account-cashback-widget py-6 border-t border-border mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="h5 flex items-center gap-2">
          <span>🎁</span> {_('Cashback & Store Credit')}
        </h2>
        <a
          href="/account/cashback"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          {_('View details & history')} &rarr;
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-background p-4">
        <div>
          <span className="text-xs text-muted-foreground block">{_('Available Credit')}</span>
          <span className="text-xl font-bold text-emerald-600">${balance.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">{_('Pending Cashback')}</span>
          <span className="text-xl font-bold text-amber-600">${pendingBalance.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}

export const layout = {
  areaId: 'accountPageAddressBook',
  sortOrder: 20
};
