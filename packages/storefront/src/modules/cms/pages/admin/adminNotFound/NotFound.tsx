import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import React from 'react';

function Name() {
  return (
    <h1 className="page-name text-center mt-6 mb-4">404 Page Not Found</h1>
  );
}

interface ContentProps {
  dashboardUrl: string;
}
function Content({ dashboardUrl }: ContentProps) {
  return (
    <div className="page-content">
      <div className="text-center">The page you requested does not exist.</div>
      <div className="mt-5 text-center">
        <Button title="Back To Dashboard" url={dashboardUrl} outline />
      </div>
    </div>
  );
}

export default function NotFound({ dashboardUrl }: ContentProps) {
  return (
    <div className="page-width mt-6">
      <div className="pt-4">
        <Area
          id="notfound-page"
          coreComponents={[
            {
              component: { default: Name },
              props: {},
              sortOrder: 10,
              id: 'notfound-page-title'
            },
            {
              component: { default: Content },
              props: { dashboardUrl },
              sortOrder: 20,
              id: 'notfound-page-content'
            }
          ]}
        />
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
    dashboardUrl: url(routeId: "dashboard")
  }
`;
