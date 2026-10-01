import { AccountHeader } from '@components/frontStore/customer/AccountHeader.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useQuery } from 'urql';

const CUSTOMER_CASHBACK_QUERY = `
  query CustomerCashbackQuery {
    currentCustomer {
      customerId
      fullName
      cashbackBalance {
        balance
        pendingBalance
        transactions {
          uuid
          orderId
          amount
          type
          status
          note
          createdAt
        }
      }
    }
  }
`;

export default function AccountCashbackPage() {
  const [result] = useQuery({ query: CUSTOMER_CASHBACK_QUERY });
  const { data, fetching, error } = result;

  const cashbackData = data?.currentCustomer?.cashbackBalance;
  const balance = cashbackData?.balance ?? 0;
  const pendingBalance = cashbackData?.pendingBalance ?? 0;
  const transactions = cashbackData?.transactions ?? [];

  return (
    <div className="account mx-auto max-w-3xl py-10 px-4">
      <AccountHeader />

      {/* Account Navigation Tabs */}
      <nav className="account-nav sticky top-0 z-20 mb-6 border-b border-border bg-background">
        <div className="flex items-center gap-6">
          <a href="/account" className="border-b-2 border-transparent py-3 text-sm text-muted-foreground hover:text-foreground">
            {_('Dashboard')}
          </a>
          <a href="/account/orders" className="border-b-2 border-transparent py-3 text-sm text-muted-foreground hover:text-foreground">
            {_('Orders')}
          </a>
          <a href="/account/cashback" className="border-b-2 border-foreground font-medium py-3 text-sm text-foreground">
            {_('Cashback & Rewards')}
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{_('Cashback & Rewards')}</h2>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            {_('Active Rebate Program')}
          </span>
        </div>

        {fetching ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-xl bg-muted/60"></div>
            <div className="h-48 rounded-xl bg-muted/40"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {_('Failed to load cashback details. Please try again.')}
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-6 shadow-sm dark:from-emerald-950/20 dark:to-teal-950/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    {_('Available Balance')}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    💰
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-foreground">
                  ${balance.toFixed(2)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {_('Can be applied as instant credit at checkout')}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-6 shadow-sm dark:from-amber-950/20 dark:to-orange-950/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    {_('Pending Balance')}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                    ⏳
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-foreground">
                  ${pendingBalance.toFixed(2)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {_('Will be unlocked once recent orders are verified')}
                </p>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">{_('Transaction History')}</h3>
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">{_('No cashback transactions yet.')}</p>
                  <p className="mt-1 text-xs">{_('Earn cashback automatically when placing qualifying orders!')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-2">{_('Date')}</th>
                        <th className="py-3 px-2">{_('Type')}</th>
                        <th className="py-3 px-2">{_('Description / Order')}</th>
                        <th className="py-3 px-2 text-right">{_('Amount')}</th>
                        <th className="py-3 px-2 text-center">{_('Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((tx: any) => (
                        <tr key={tx.uuid} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-2 text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-2 font-medium capitalize text-xs">
                            {tx.type.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-2 text-xs">
                            {tx.note || (tx.orderId ? `Order #${tx.orderId}` : '-')}
                          </td>
                          <td className={`py-3.5 px-2 text-right font-semibold text-xs ${
                            tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              tx.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
