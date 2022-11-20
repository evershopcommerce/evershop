import React from 'react';
import './AdminUser.scss';

export default function AdminUser({ adminUser, logoutUrl }) {
  const [showLogout, setShowLogout] = React.useState(false);

  const show = (e) => {
    e.preventDefault();
    setShowLogout(!showLogout);
  }

  if (!adminUser) {
    return null;
  }
  const { fullName, email } = adminUser;
  return <div className='admin-user flex flex-grow justify-end items-center'>
    <div className='flex justify-items-start gap-1 justify-center'>
      <div className='relative'>
        <a className='first-letter' href="#" onClick={(e) => show(e)}>{fullName[0]}</a>
        {showLogout && <div className='logout bg-background shadow p-2'>
          <div>
            <div>
              Hello <span className='text-primary'>{fullName}!</span>
            </div>
            <div className='mt-1'>
              <a className='text-critical' href={logoutUrl}>Logout</a>
            </div>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

export const layout = {
  areaId: 'header',
  sortOrder: 50
}

export const query = `
  query Query {
    adminUser(id: getContextValue("userId", null)) {
      adminUserId
      fullName
      email
    },
    logoutUrl: url(routeId: "adminLogout")
  }
`