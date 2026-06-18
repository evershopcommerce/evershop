import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@components/common/ui/DropdownMenu.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { LogOut } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

export default function AdminUser({ adminUser, logoutUrl, loginPage }) {
  const logout = async () => {
    const response = await fetch(logoutUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.status === 200) {
      window.location.href = loginPage;
    } else {
      toast.error(_('Logout failed'));
    }
  };

  if (!adminUser) {
    return null;
  }
  const { fullName } = adminUser;
  return (
    <div className="admin-user flex grow justify-end items-center">
      <div className="flex justify-items-start gap-2 justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button
              className="w-[2.188rem] h-[2.188rem] flex items-center justify-center rounded-full bg-primary/45 font-semibold border-2 border-primary cursor-pointer hover:bg-primary/60 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              {fullName[0]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-45">
            <DropdownMenuLabel className="text-base font-normal">
              {_('Hello')}{' '}
              <span className="text-primary">{fullName}!</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
            >
              <div className="flex justify-start items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>{_('Logout')}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

AdminUser.propTypes = {
  adminUser: PropTypes.shape({
    email: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired
  }),
  loginPage: PropTypes.string.isRequired,
  logoutUrl: PropTypes.string.isRequired
};

AdminUser.defaultProps = {
  adminUser: null
};

export const layout = {
  areaId: 'header',
  sortOrder: 50
};

export const query = `
  query Query {
    adminUser: currentAdminUser {
      adminUserId
      fullName
      email
    },
    logoutUrl: url(routeId: "adminLogoutJson"),
    loginPage: url(routeId: "adminLogin")
  }
`;
