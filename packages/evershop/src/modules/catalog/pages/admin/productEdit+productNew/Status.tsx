import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardFooter,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface StatusProps {
  product:
    | {
        status: number;
        visibility: number;
      }
    | undefined;
}
export default function Status({ product }: StatusProps) {
  return (
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Product Status')}</CardTitle>
        <CardDescription>
          {_('Set the status and visibility of the product.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroupField
          name="status"
          label={_('Status')}
          options={[
            { value: 0, label: _('Disabled') },
            { value: 1, label: _('Enabled') }
          ]}
          defaultValue={product?.status === 0 ? 0 : 1}
          required
          helperText={_(
            'Disabled products will not be visible in the store and cannot be purchased.'
          )}
        />
      </CardContent>
      <CardContent className="border-t border-t-border pt-6">
        <RadioGroupField
          name="visibility"
          label={_('Visibility')}
          options={[
            { value: 0, label: _('Not visible individually') },
            { value: 1, label: _('Catalog, Search') }
          ]}
          defaultValue={product?.visibility === 0 ? 0 : 1}
          required
          helperText={_(
            'Visibility determines where the product appears in the store. It does not affect the saleability of the product.'
          )}
        />
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}

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
