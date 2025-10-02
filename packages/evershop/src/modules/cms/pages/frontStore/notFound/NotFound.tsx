import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

function Name() {
  return (
    <h1 className="page-name text-center mt-6 mb-4">
      {_('404 Page Not Found')}
    </h1>
  );
}

interface ContentProps {
  continueShoppingUrl: string;
}

function Content({ continueShoppingUrl }: ContentProps) {
  return (
    <div className="page-content">
      <div className="text-center">
        {_('The page you requested does not exist.')}
      </div>
      <div className="mt-5 text-center">
        <Button
          title={_('Continue shopping')}
          url={continueShoppingUrl}
          outline
        />
      </div>
    </div>
  );
}
interface NotFoundProps {
  continueShoppingUrl: string;
}
export default function NotFound({ continueShoppingUrl }: NotFoundProps) {
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
              props: { continueShoppingUrl },
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
    continueShoppingUrl: url(routeId: "homepage")
  }
`;
