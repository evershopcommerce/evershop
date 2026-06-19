import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Setting')}</CardTitle>
        <CardDescription>
          {_('Manage the setting of the attribute.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroupField
          name="is_required"
          label={_('Is Required?')}
          options={[
            { value: 0, label: _('No') },
            { value: 1, label: _('Yes') }
          ]}
          required
          validation={{
            required: _('This field is required')
          }}
          defaultValue={attribute?.isRequired === 0 ? 0 : 1}
        />
      </CardContent>
      <CardContent className="pt-6 border-t border-border">
        <RadioGroupField
          name="is_filterable"
          label={_('Is Filterable?')}
          options={[
            { value: 0, label: _('No') },
            { value: 1, label: _('Yes') }
          ]}
          required
          validation={{
            required: _('This field is required')
          }}
          defaultValue={attribute?.isFilterable === 1 ? 1 : 0}
        />
      </CardContent>
      <CardContent className="pt-6 border-t border-border">
        <RadioGroupField
          name="display_on_frontend"
          label={_('Display on Frontend?')}
          options={[
            { value: 0, label: _('No') },
            { value: 1, label: _('Yes') }
          ]}
          required
          validation={{
            required: _('This field is required')
          }}
          defaultValue={attribute?.displayOnFrontend === 1 ? 1 : 0}
        />
      </CardContent>
      <CardContent className="pt-6 border-t border-border">
        <NumberField
          name="sort_order"
          label={_('Sort Order')}
          placeholder={_('Sort order')}
          required
          validation={{
            required: _('Sort order is required'),
            min: {
              value: 0,
              message: _('Sort order must be a positive number')
            }
          }}
          defaultValue={attribute?.sortOrder}
        />
      </CardContent>
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
