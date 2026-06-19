import { Card, CardContent, CardHeader } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ChevronRight } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';

interface Route {
  id: string;
  name: string;
  path: string;
  isApi: boolean;
  isAdmin: boolean;
  editableInPageBuilder: boolean;
}

interface RoutePickerProps {
  routes: Route[];
  editUrlBase: string;
}

/**
 * Empty-state fallback when no route has opted into page-builder editing
 * via `"editable": true` in its `route.json`. The /admin/page-builder
 * route normally redirects to the first editable route's editor.
 */
export default function RoutePicker({ routes, editUrlBase }: RoutePickerProps) {
  const editable = (routes || []).filter(
    (r) =>
      r.editableInPageBuilder === true &&
      !r.isApi &&
      !r.isAdmin &&
      typeof r.path === 'string'
  );

  return (
    <Card>
      <CardHeader title={_('Editable routes')} />
      <CardContent>
        {editable.length === 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {_('No routes have opted into page-builder editing yet.')}
            </p>
            <p className="text-sm text-muted-foreground">
              {_('Add')}{' '}
              <code className="text-xs bg-muted/40 px-1 rounded">
                {'"editable": true'}
              </code>{' '}
              {_("to a storefront route's")}{' '}
              <code className="text-xs">route.json</code>{' '}
              {_('to make it appear here.')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-divider">
            {editable.map((route) => (
              <li key={route.id}>
                <a
                  href={`${editUrlBase}/${encodeURIComponent(route.id)}`}
                  className="flex items-center justify-between py-3 px-2 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <div className="font-medium">{route.name}</div>
                    <div className="text-sm text-muted-foreground">{route.path}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

RoutePicker.propTypes = {
  routes: PropTypes.array.isRequired,
  editUrlBase: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    routes {
      id
      name
      path
      isApi
      isAdmin
      editableInPageBuilder
    }
    editUrlBase: url(routeId:"pageBuilder")
  }
`;
