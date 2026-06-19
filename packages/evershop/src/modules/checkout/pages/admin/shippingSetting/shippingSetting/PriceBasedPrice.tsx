import { NumberField } from '@components/common/form/NumberField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

export interface PriceBasedPriceProps {
  lines: Array<{
    minPrice: { value: number };
    cost: { value: number };
  }>;
}

export function PriceBasedPrice({ lines }: PriceBasedPriceProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'price_based_cost'
  });

  // Initialize the field array with existing lines if it's empty
  React.useEffect(() => {
    if (fields.length === 0 && lines.length > 0) {
      lines.forEach((line) => {
        append({
          min_price: line.minPrice?.value || undefined,
          cost: line.cost?.value || undefined
        });
      });
    }
  }, [lines, fields.length, append]);

  // Ensure there's at least one row
  React.useEffect(() => {
    if (lines.length === 0) {
      append({
        min_price: undefined,
        cost: undefined
      });
    }
  }, [lines.length, append]);

  return (
    <div className="my-5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-none">{_('Min Price')}</TableHead>
            <TableHead className="border-none">{_('Shipping Cost')}</TableHead>
            <TableHead className="border-none">{_('Action')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id} className="border-border py-5">
              <TableCell>
                <NumberField
                  name={`price_based_cost.${index}.min_price`}
                  placeholder={_('Min Price')}
                  required
                  validation={{ required: _('Min price is required') }}
                />
              </TableCell>
              <TableCell>
                <NumberField
                  name={`price_based_cost.${index}.cost`}
                  placeholder={_('Shipping Cost')}
                  required
                  validation={{ required: _('Shipping cost is required') }}
                />
              </TableCell>
              <TableCell>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-destructive"
                  >
                    {_('Delete')}
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="border-border">
          <TableRow>
            <TableCell colSpan={3} className="border-none">
              <Button
                type="button"
                size={'sm'}
                variant={'outline'}
                onClick={() => {
                  append({
                    min_weight: undefined,
                    cost: undefined
                  });
                }}
              >
                {_('+ Add Line')}
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
