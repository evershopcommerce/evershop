import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Card } from '../../../../cms/components/admin/Card';

export default function Inventory({ product }) {
  const inventory = product?.inventory || {};
  return (
    <Card
      title="Inventory"
      subdued
    >
      <Card.Session>
        <Field
          id="manage_stock"
          name="manage_stock"
          value={inventory.manageStock}
          label="Manage stock?"
          options={[{ value: 0, text: 'No' }, { value: 1, text: 'Yes' }]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="stock_availability"
          name="stock_availability"
          value={inventory.stockAvailability}
          label="Stock availability"
          options={[{ value: 0, text: 'No' }, { value: 1, text: 'Yes' }]}
          type="radio"
        />
      </Card.Session>
      <Card.Session>
        <Field
          id="qty"
          name="qty"
          value={inventory.qty}
          placeholder="Quantity"
          label="Quantity"
          type="text"
          validationRules={['notEmpty']}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
}

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      inventory {
        qty
        stockAvailability
        manageStock
      }
    }
  }
`;