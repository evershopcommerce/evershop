import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import { Card } from '@components/admin/cms/Card';

export default function Status({ product }) {
  return (
    <Card title="Product status" subdued>
      <Card.Session>
        <Field
          id="status"
          name="status"
          value={product?.status === undefined ? 1 : product.status}
          label="Status"
          options={[
            { value: 0, text: 'Disabled' },
            { value: 1, text: 'Enabled' }
          ]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="visibility"
          name="visibility"
          value={product?.visibility === undefined ? 1 : product.visibility}
          label="Visibility"
          options={[
            { value: 0, text: 'Not visible' },
            { value: 1, text: 'Visible' }
          ]}
          type="radio"
        />
      </Card.Session>
    </Card>
  );
}

Status.propTypes = {
  product: PropTypes.shape({
    status: PropTypes.number.isRequired,
    visibility: PropTypes.number.isRequired
  })
};

Status.defaultProps = {
  product: {
    status: 1,
    visibility: 1
  }
};

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      status
      visibility
      category {
        value: categoryId
        label: name
      }
    }
  }
`;
