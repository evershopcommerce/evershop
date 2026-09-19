import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import { useCustomerDispatch } from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Account pages header: the "My account" title with a Log out button inline on
 * the right. Shared by the dashboard and the orders page.
 */
export function AccountHeader() {
  const { logout } = useCustomerDispatch();
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      toast.error((error as Error)?.message || _('Logout failed'));
    }
  };
  return (
    <div className="account-header mb-6 flex items-center justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        {_('My account')}
      </h1>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        {_('Log out')}
      </Button>
    </div>
  );
}
