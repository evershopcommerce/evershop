import { Card } from '@components/admin/Card.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import React from 'react';
import { useFormContext } from 'react-hook-form';

export interface CategoryStatusProps {
  category?: {
    status?: number;
    includeInNav?: number;
    showProducts?: number;
  };
}

export default function Status({ category }: CategoryStatusProps) {
  const { register } = useFormContext();

  return (
    <Card>
      <Card.Session title="Status">
        <RadioGroupField
          name="status"
          options={[
            { label: 'Disabled', value: 0 },
            { label: 'Enabled', value: 1 }
          ]}
          defaultValue={category?.status === 0 ? 0 : 1}
          validation={{
            required: 'This field is required'
          }}
        />
      </Card.Session>
      <Card.Session title="Include In Store Menu">
        <RadioGroupField
          name="include_in_nav"
          options={[
            { label: 'No', value: 0 },
            { label: 'Yes', value: 1 }
          ]}
          defaultValue={category?.includeInNav === 0 ? 0 : 1}
          validation={{
            required: 'This field is required'
          }}
        />
      </Card.Session>
      <Card.Session title="Show Products?">
        <RadioGroupField
          name="show_products"
          options={[
            { label: 'No', value: 0 },
            { label: 'Yes', value: 1 }
          ]}
          defaultValue={category?.showProducts === 0 ? 0 : 1}
          validation={{
            required: 'This field is required'
          }}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      status
      includeInNav
      showProducts
    }
  }
`;
