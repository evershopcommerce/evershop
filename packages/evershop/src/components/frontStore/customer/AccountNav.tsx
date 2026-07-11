import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import React from 'react';

/**
 * Sticky horizontal tab nav shared by the account pages. Pins to the top on
 * scroll (the site header is static, so top-0 is correct). Log out lives in the
 * page header, not here.
 */
export function AccountNav({ active }: { active: 'dashboard' | 'orders' }) {
  const tab = (isActive: boolean) =>
    cn(
      '-mb-px border-b-2 py-3 text-sm transition-colors',
      isActive
        ? 'border-foreground font-medium text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    );
  return (
    <nav className="account-nav sticky top-0 z-20 border-b border-border bg-background">
      <div className="flex items-center gap-6">
        <a href="/account" className={tab(active === 'dashboard')}>
          {_('Dashboard')}
        </a>
        <a href="/account/orders" className={tab(active === 'orders')}>
          {_('Orders')}
        </a>
      </div>
    </nav>
  );
}
