import Area from '@components/common/Area.js';
import {
  useCustomer,
  useCustomerDispatch
} from '@components/frontStore/customer/CustomerContext.jsx';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { AtSymbolIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { toast } from 'react-toastify';

interface AccountInfoProps {
  title?: string;
  showLogout?: boolean;
}
export default function AccountInfo({ title, showLogout }: AccountInfoProps) {
  const { customer: account } = useCustomer();
  const { logout } = useCustomerDispatch();
  return (
    <div className="account__details divide-y">
      <div className="flex justify-between items-center">
        {title && <h2>{title}</h2>}
        {showLogout && (
          <a
            className="text-interactive"
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              try {
                await logout();
                window.location.href = '/';
              } catch (error) {
                toast.error(error.message);
              }
            }}
          >
            {_('Logout')}
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 py-5">
        <Area
          id="accountDetails"
          coreComponents={[
            {
              component: {
                default: (
                  <div className="account__details__name flex gap-2 py-2">
                    <div>
                      <UserCircleIcon width={20} height={20} />
                    </div>
                    <div>{account?.fullName}</div>
                  </div>
                )
              },
              sortOrder: 10
            },
            {
              component: {
                default: () => (
                  <div className="account__details__email flex gap-2 py-2">
                    <div>
                      <AtSymbolIcon width={20} height={20} />
                    </div>
                    <div>{account?.email}</div>
                  </div>
                )
              },
              sortOrder: 15
            }
          ]}
        />
      </div>
    </div>
  );
}
