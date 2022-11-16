import React from 'react';
import Area from '../../../../../lib/components/Area';

export default function Layout({ logoutUrl }) {
  return <div>
    <h1 className='text-center'>My Account</h1>
    <div className='page-width mt-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
      <div className='col-span-1 md:col-span-2'>
        <div className='border-b mb-1 border-textSubdued'><h2>Order History</h2></div>
        <Area
          id='accountPageLeft'
          noOuter={true}
        />
      </div>
      <div className='col-span-1'>
        <div className='border-b mb-1 flex justify-between items-center  border-textSubdued'>
          <h2>Account Details</h2>
          <a className='text-interactive' href={logoutUrl}>Logout</a>
        </div>
        <Area
          id='accountPageRight'
          noOuter={true}
        />
      </div>
    </div>
  </div>
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    logoutUrl: url(routeId: "logout")
  }
`;