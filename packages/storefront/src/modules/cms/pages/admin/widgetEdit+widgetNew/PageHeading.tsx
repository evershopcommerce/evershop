import { PageHeading } from '@components/admin/PageHeading.js';
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
      heading={widget ? `Editing widget ${widget.name}` : 'Create a new widget'}
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
    page: widget(id: getContextValue("widgetId", null)) {
      name
    }
    backUrl: url(routeId: "widgetGrid")
  }
`;
