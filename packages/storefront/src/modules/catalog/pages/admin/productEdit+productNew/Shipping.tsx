import { Card } from '@components/admin/Card.js';
import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

interface ShippingProps {
  product:
    | {
        noShippingRequired: boolean;
        weight: {
          value: number;
          unit: string;
        };
      }
    | undefined;
  setting: {
    weightUnit: string;
  };
}
export default function Shipping({ product, setting }: ShippingProps) {
  const shipping = product || {
    noShippingRequired: undefined,
    weight: undefined
  };
  const { control } = useFormContext();
  const noShippingRequired = useWatch({
    control,
    name: 'no_shipping_required',
    defaultValue:
      (shipping.noShippingRequired !== null && shipping.noShippingRequired) ||
      false
  });

  return (
    <Card title="Shipping" subdued>
      <Card.Session>
        <CheckboxField
          name="no_shipping_required"
          label="No shipping required?"
          defaultValue={shipping.noShippingRequired === true}
          helperText="Select this option if the product is a digital product or service that does not require shipping."
          wrapperClassName="mb-0"
        />
      </Card.Session>
      <Card.Session>
        {!noShippingRequired && (
          <NumberField
            name="weight"
            placeholder="Enter weight"
            label={`Weight`}
            defaultValue={shipping.weight?.value}
            unit={setting?.weightUnit}
            required
            validation={{
              min: {
                value: 0,
                message: 'Weight must be a positive number'
              }
            }}
            helperText={'Weight must be a positive number'}
          />
        )}
        {noShippingRequired && (
          <NumberField
            name="weight_no_shipping"
            placeholder="Enter weight"
            label={`Weight`}
            defaultValue={shipping.weight?.value}
            unit={setting?.weightUnit}
            disabled
            helperText={'Weight must be a positive number'}
          />
        )}
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
    product(id: getContextValue("productId", null)) {
      weight {
        value
        unit
      }
      noShippingRequired
    }
    setting {
      weightUnit
    }
  }
`;
