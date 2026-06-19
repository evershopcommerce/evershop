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

export interface CategoryStatusProps {
  category?: {
    status?: number;
    includeInNav?: number;
    showProducts?: number;
  };
}

export default function Status({ category }: CategoryStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Status')}</CardTitle>
        <CardDescription>
          {_('Manage the status settings of the category.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroupField
          name="status"
          label={_('Status')}
          options={[
            { label: _('Disabled'), value: 0 },
            { label: _('Enabled'), value: 1 }
          ]}
          defaultValue={category?.status === 0 ? 0 : 1}
          validation={{
            required: _('This field is required')
          }}
        />
      </CardContent>
      <CardContent className="pt-6 border-t border-border">
        <RadioGroupField
          name="include_in_nav"
          label={_('Include in Store Menu?')}
          options={[
            { label: _('No'), value: 0 },
            { label: _('Yes'), value: 1 }
          ]}
          defaultValue={category?.includeInNav === 0 ? 0 : 1}
          validation={{
            required: _('This field is required')
          }}
        />
      </CardContent>
      <CardContent className="pt-6 border-t border-border">
        <RadioGroupField
          name="show_products"
          label={_('Show products?')}
          options={[
            { label: _('No'), value: 0 },
            { label: _('Yes'), value: 1 }
          ]}
          defaultValue={category?.showProducts === 0 ? 0 : 1}
          validation={{
            required: _('This field is required')
          }}
        />
      </CardContent>
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
