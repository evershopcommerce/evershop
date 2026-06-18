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

interface InventoryProps {
  product:
    | {
        inventory: {
          qty: number;
          stockAvailability: number;
          manageStock: number;
        };
      }
    | undefined;
}
export default function Inventory({ product }: InventoryProps) {
  const inventory = product?.inventory || {
    qty: undefined,
    stockAvailability: undefined,
    manageStock: undefined
  };
  return (
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Inventory')}</CardTitle>
        <CardDescription>
          {_('Manage the inventory settings of the product.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroupField
          name="manage_stock"
          label={_('Manage Stock')}
          options={[
            { value: 1, label: _('Yes') },
            { value: 0, label: _('No') }
          ]}
          defaultValue={inventory.manageStock === 0 ? 0 : 1}
          required
        />
      </CardContent>
      <CardContent className="border-t border-t-border pt-6">
        <RadioGroupField
          name="stock_availability"
          label={_('Stock Availability')}
          options={[
            { value: 1, label: _('In Stock') },
            { value: 0, label: _('Out of Stock') }
          ]}
          defaultValue={inventory.stockAvailability === 0 ? 0 : 1}
          required
        />
      </CardContent>
      <CardContent className="border-t border-t-border pt-6">
        <NumberField
          name="qty"
          defaultValue={inventory.qty}
          placeholder={_('Quantity')}
          label={_('Quantity')}
          required
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
    product(id: getContextValue("productId", null)) {
      inventory {
        qty
        stockAvailability
        manageStock
      }
    }
  }
`;
