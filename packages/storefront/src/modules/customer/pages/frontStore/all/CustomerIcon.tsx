import { UserCircleIcon as Icon } from '@heroicons/react/24/outline';
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
    <div className="self-center">
      <a href={customer ? accountUrl : loginUrl}>
        <Icon width={25} height={25} />
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
