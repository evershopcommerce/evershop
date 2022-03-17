import React from 'react';
import Area from '../../../../lib/components/Area';
import { getComponents } from '../../../../lib/components/getComponents';

export default function AdminLayout() {
  return (
    <>
      <div className="header">
        <Area id="header" noOuter components={getComponents()} />
      </div>
      <div className="content-wrapper">
        <div className="admin-navigation">
          <Area id="admin.navigation" noOuter components={getComponents()} />
        </div>
        <div className="main-content">
          <Area id="content" className="main-content-inner" components={getComponents()} />
          <div className="footer">
            <div className="copyright"><span>Copyright © 2021 Nodejscart Commerce</span></div>
            <div className="version"><span>Version 1.0 dev</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
