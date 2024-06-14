import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Area from '@components/common/Area';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function Layout({ logoutUrl }) {
  const logout = async (e) => {
    e.preventDefault();
    const respone = await fetch(logoutUrl, {
      method: 'GET'
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
      <h1 className="text-center">{_('My Account')}</h1>
      <div className="page-width mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="col-span-1 md:col-span-2">
          <div className="border-b mb-1 border-textSubdued">
            <h2>{_('Order History')}</h2>
          </div>
          <Area id="accountPageLeft" noOuter />
        </div>
        <div className="col-span-1">
          <div className="border-b mb-1 flex justify-between items-center  border-textSubdued">
            <h2>{_('Account Details')}</h2>
            <a className="text-interactive" href="#" onClick={(e) => logout(e)}>
              {_('Logout')}
            </a>
          </div>
          <Area id="accountPageRight" noOuter />
        </div>
      </div>
    </div>
  );
}

Layout.propTypes = {
  logoutUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    logoutUrl: url(routeId: "customerLogoutJson")
  }
`;
