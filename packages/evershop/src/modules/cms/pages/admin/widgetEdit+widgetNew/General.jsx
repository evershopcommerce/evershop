import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';

export default function StatusAndLayout({ widget }) {
  return (
    <Card>
      <Card.Session title="Name">
        <Field
          type="text"
          name="name"
          value={widget?.name}
          placeholder="Name"
          validationRules={['notEmpty']}
        />
      </Card.Session>
      <Card.Session title="Status">
        <Field
          type="radio"
          name="status"
          options={[
            { value: 0, text: 'Disabled' },
            { value: 1, text: 'Enabled' }
          ]}
          value={widget?.status}
        />
      </Card.Session>
      <Card.Session title="Area">
        <Field
          type="text"
          name="area"
          value={widget?.area}
          placeholder="Area"
          validationRules={['notEmpty']}
        />
      </Card.Session>
      <Card.Session title="Page">
        <Field
          type="text"
          name="route"
          value={widget?.route}
          placeholder="Page"
          validationRules={['notEmpty']}
        />
      </Card.Session>
      <Card.Session title="Sort order">
        <Field
          type="text"
          name="sort_order"
          value={widget?.sortOrder}
          placeholder="Sort order"
          validationRules={['notEmpty', 'number']}
        />
      </Card.Session>
    </Card>
  );
}

StatusAndLayout.propTypes = {
  widget: PropTypes.shape({
    status: PropTypes.number,
    name: PropTypes.string.isRequired,
    sortOrder: PropTypes.number,
    area: PropTypes.string,
    route: PropTypes.string
  })
};

StatusAndLayout.defaultProps = {
  widget: null
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    widget(id: getContextValue("widgetId", null)) {
      name
      status
      sortOrder
      area
      route
    }
  }
`;
