import React from 'react';
import { toast } from 'react-toastify';
import Area from '../../../../../lib/components/Area';

export default function Layout({ account: { logoutApi } }) {
  const logout = async (e) => {
    e.preventDefault();
    const respone = await fetch(logoutApi, {
      method: 'DELETE'
    });
    const data = await respone.json();
    if (data.error) {
      toast.error(data.error.message);
    } else {
      window.location.href = '/';
    }
  };
  return (
    <div>
      <h1 className="text-center">My Account</h1>
      <div className="page-width mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="col-span-1 md:col-span-2">
          <div className="border-b mb-1 border-textSubdued"><h2>Order History</h2></div>
          <Area
            id="accountPageLeft"
            noOuter
          />
        </div>
        <div className="col-span-1">
          <div className="border-b mb-1 flex justify-between items-center  border-textSubdued">
            <h2>Account Details</h2>
            <a className="text-interactive" href="#" onClick={(e) => logout(e)}>Logout</a>
          </div>
          <Area
            id="accountPageRight"
            noOuter
          />
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    account: customer(id: getContextValue("customerId", null)) {
      logoutApi
    }
  }
`;
