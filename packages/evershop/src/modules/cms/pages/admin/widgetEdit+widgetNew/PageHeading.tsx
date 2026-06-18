import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface WidgetEditPageHeadingProps {
  backUrl: string;
  widget?: {
    name: string;
  };
}
export default function WidgetEditPageHeading({
  backUrl,
  widget
}: WidgetEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        widget
          ? _('Editing widget ${name}', { name: widget.name })
          : _('Create a new widget')
      }
    />
  );
}

WidgetEditPageHeading.defaultProps = {
  widget: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    widget(id: getContextValue("widgetId", null)) {
      name
    }
    backUrl: url(routeId: "widgetGrid")
  }
`;
