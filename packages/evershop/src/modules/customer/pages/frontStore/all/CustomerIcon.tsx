import { User } from 'lucide-react';
import React from 'react';

interface UserIconProps {
  customer: {
    uuid: string;
    fullName: string;
    email: string;
  };
  accountUrl: string;
  loginUrl: string;
}

export default function UserIcon({
  customer,
  accountUrl,
  loginUrl
}: UserIconProps) {
  return (
    <div className="customer-icon flex items-center">
      <a
        href={customer ? accountUrl : loginUrl}
        aria-label={customer ? 'Account' : 'Sign in'}
        className="rounded-md p-2 text-foreground/80 hover:bg-muted hover:text-foreground"
      >
        <User className="h-5 w-5" />
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'headerMiddleRight',
  sortOrder: 10
};

export const query = `
  query Query {
    customer: currentCustomer {
      uuid
      fullName
      email
    }
    accountUrl: url(routeId: "account")
    loginUrl: url(routeId: "login")
  }
`;
