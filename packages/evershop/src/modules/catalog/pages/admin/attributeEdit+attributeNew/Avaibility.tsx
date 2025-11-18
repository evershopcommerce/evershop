import { Card } from '@components/admin/Card.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import React from 'react';

interface GeneralProps {
  attribute?: {
    displayOnFrontend?: number;
    isFilterable?: number;
    isRequired?: number;
    sortOrder?: number;
  };
}
export default function General({ attribute }: GeneralProps) {
  return (
    <Card title="Setting" subdued>
      <Card.Session>
        <RadioGroupField
          name="is_required"
          label="Is Required?"
          options={[
            { value: 0, label: 'No' },
            { value: 1, label: 'Yes' }
          ]}
          required
          validation={{
            required: 'This field is required'
          }}
          defaultValue={attribute?.isRequired === 0 ? 0 : 1}
        />
      </Card.Session>
      <Card.Session>
        <RadioGroupField
          name="is_filterable"
          label="Is Filterable?"
          options={[
            { value: 0, label: 'No' },
            { value: 1, label: 'Yes' }
          ]}
          required
          validation={{
            required: 'This field is required'
          }}
          defaultValue={attribute?.isFilterable === 1 ? 1 : 0}
        />
      </Card.Session>
      <Card.Session>
        <RadioGroupField
          name="display_on_frontend"
          label="Display on Frontend?"
          options={[
            { value: 0, label: 'No' },
            { value: 1, label: 'Yes' }
          ]}
          required
          validation={{
            required: 'This field is required'
          }}
          defaultValue={attribute?.displayOnFrontend === 1 ? 1 : 0}
        />
      </Card.Session>
      <Card.Session>
        <NumberField
          name="sort_order"
          label="Sort Order"
          placeholder="Sort order"
          required
          validation={{
            required: 'Sort order is required',
            min: {
              value: 0,
              message: 'Sort order must be a positive number'
            }
          }}
          defaultValue={attribute?.sortOrder}
        />
      </Card.Session>
    </Card>
  );
}

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
