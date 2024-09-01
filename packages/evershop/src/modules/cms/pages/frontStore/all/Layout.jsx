import React from 'react';
import Area from '@components/common/Area';
import LoadingBar from '@components/common/LoadingBar';
import './Layout.scss';
import './tailwind.scss';

export default function Layout() {
  return (
    <>
      <LoadingBar />
      <div className="header grid grid-cols-3">
        <Area
          id="header"
          noOuter
          coreComponents={[
            {
              component: { default: Area },
              props: {
                id: 'icon-wrapper',
                className: 'icon-wrapper flex justify-end space-x-4'
              },
              sortOrder: 20
            }
          ]}
        />
      </div>
      <main className="content">
        <Area id="content" noOuter />
      </main>
      <div className="footer">
        <Area id="footer" noOuter coreComponents={[]} />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'body',
  sortOrder: 1
};
