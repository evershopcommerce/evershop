import React from 'react';
import Area from '@components/common/Area';
import './Layout.scss';
import './tailwind.scss';

export default function AdminLayout() {
  return (
    <>
      <div className="header">
        <Area id="header" noOuter />
      </div>
      <div className="content-wrapper">
        <div className="admin-navigation">
          <Area id="adminNavigation" noOuter />
        </div>
        <div className="main-content">
          <Area id="content" className="main-content-inner" />
          <div className="footer">
            <div className="copyright">
              <span>Copyright © 2021 EverShop</span>
            </div>
            <div className="version">
              <span>Version 1.0 dev</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const layout = {
  areaId: 'body',
  sortOrder: 10
};
