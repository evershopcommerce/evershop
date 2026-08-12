import Area from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Home } from 'lucide-react';
import React from 'react';

function Name() {
  return (
    <div className="page-name text-center">
      <div className="text-7xl font-bold leading-none tracking-tight text-muted-foreground/30 md:text-8xl">
        404
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">
        {_('Page not found')}
      </h1>
    </div>
  );
}

interface ContentProps {
  continueShoppingUrl: string;
}

function Content({ continueShoppingUrl }: ContentProps) {
  return (
    <div className="page-content mx-auto mt-4 max-w-md text-center">
      <p className="text-muted-foreground">
        {_("The page you're looking for doesn't exist or may have moved.")}
      </p>
      <div className="mt-8">
        <Button
          title={_('Back to home')}
          onClick={() => (window.location.href = continueShoppingUrl)}
          variant="default"
        >
          <Home className="h-4 w-4" />
          {_('Back to home')}
        </Button>
      </div>
    </div>
  );
}
interface NotFoundProps {
  continueShoppingUrl: string;
}
export default function NotFound({ continueShoppingUrl }: NotFoundProps) {
  return (
    <div className="notfound-page py-16 md:py-24">
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
