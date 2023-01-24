import React from 'react';
import Icon from '@heroicons/react/outline/UserIcon';

export default function UserIcon({ user, accountUrl, loginUrl }) {
  return (
    <div className="self-center">
      <a href={user ? accountUrl : loginUrl}>
        <Icon width={25} height={25} />
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'icon-wrapper',
  sortOrder: 30
};

export const query = `
  query Query {
    user: customer(id: getContextValue("customerId", null)) {
      uuid
      fullName
      email
    }
    accountUrl: url(routeId: "account")
    loginUrl: url(routeId: "login")
  }
`;
