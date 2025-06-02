import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import PropTypes from 'prop-types';
import React from 'react';

export default function General({ attribute }) {
  return (
    <Card title="Setting" subdued>
      <Card.Session>
        <Field
          id="is_required"
          type="radio"
          name="is_required"
          label="Is Required?"
          options={[
            { value: 0, text: 'Not required' },
            { value: 1, text: 'Required' }
          ]}
          value={attribute?.isRequired}
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="is_filterable"
          type="radio"
          name="is_filterable"
          label="Is Filterable?"
          options={[
            { value: 0, text: 'No' },
            { value: 1, text: 'Yes' }
          ]}
          value={attribute?.isFilterable}
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="display_on_frontend"
          type="radio"
          name="display_on_frontend"
          label="Show to customers?"
          options={[
            { value: 0, text: 'No' },
            { value: 1, text: 'Yes' }
          ]}
          value={attribute?.displayOnFrontend}
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="sort_order"
          type="text"
          name="sort_order"
          label="Sort order"
          value={attribute?.sortOrder}
          validationRules={['notEmpty', 'number']}
        />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  attribute: PropTypes.shape({
    displayOnFrontend: PropTypes.number,
    isFilterable: PropTypes.number,
    isRequired: PropTypes.number,
    sortOrder: PropTypes.number
  })
};

General.defaultProps = {
  attribute: {}
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeId
      isFilterable
      isRequired
      displayOnFrontend
      sortOrder
    }
  }
`;
