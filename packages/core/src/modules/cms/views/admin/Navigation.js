import React from 'react';
import Area from '../../../../lib/components/Area';
import { getComponents } from '../../../../lib/components/getComponents';

export default function AdminNavigation() {
  return (
    <div className="admin-nav-container">
      <div className="admin-nav">
        <ul className="list-unstyled">
          <Area id="admin.menu" noOuter components={getComponents()} />
        </ul>
      </div>
    </div>
  );
}
