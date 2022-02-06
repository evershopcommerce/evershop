import React from 'react';
import Area from '../../../../lib/components/Area';

export default function AdminLayout() {
  return (
    <>
      <div className="header">
        <Area id="header" noOuter />
      </div>
      <div className="content-wrapper">
        <div className="admin-navigation">
          <Area id="admin.navigation" noOuter />
        </div>
        <div className="main-content">
          <Area id="content" className="main-content-inner" />
          <div className="footer">
            <div className="copyright"><span>Copyright © 2021 Nodejscart Commerce</span></div>
            <div className="version"><span>Version 1.0 dev</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
