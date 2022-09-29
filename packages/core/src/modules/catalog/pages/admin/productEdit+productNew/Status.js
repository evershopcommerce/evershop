import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Card } from '../../../../cms/components/admin/Card';

export default function Status({ product }) {
  return (
    <Card
      title="Product status"
      subdued
    >
      <Card.Session>
        <Field
          id="status"
          name="status"
          value={product?.status}
          label="Status"
          options={[{ value: 0, text: 'Disabled' }, { value: 1, text: 'Enabled' }]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="visibility"
          name="visibility"
          value={product?.visibility}
          label="Visibility"
          options={[{ value: 0, text: 'Not visible' }, { value: 1, text: 'Visible' }]}
          type="radio"
        />
      </Card.Session>
    </Card>
  );
}


export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
}

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      status
      visibility
    }
  }
`;