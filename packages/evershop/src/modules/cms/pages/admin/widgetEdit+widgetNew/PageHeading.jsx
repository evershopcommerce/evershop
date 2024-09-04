import PropTypes from 'prop-types';
import React from 'react';
import PageHeading from '@components/admin/cms/PageHeading';

export default function WidgetEditPageHeading({ backUrl, widget }) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={widget ? `Editing widget ${widget.name}` : 'Create a new widget'}
    />
  );
}

WidgetEditPageHeading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  widget: PropTypes.shape({
    name: PropTypes.string.isRequired
  })
};

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
