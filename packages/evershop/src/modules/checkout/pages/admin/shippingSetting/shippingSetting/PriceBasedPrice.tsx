import { NumberField } from '@components/common/form/NumberField.js';
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
      <table className="border-collapse divide-y">
        <thead>
          <tr>
            <th className="border-none">Min Price</th>
            <th className="border-none">Shipping Cost</th>
            <th className="border-none">Action</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr key={field.id} className="border-divider py-5">
              <td className="border-none">
                <NumberField
                  name={`price_based_cost.${index}.min_price`}
                  placeholder="Min Price"
                  required
                  validation={{ required: 'Min price is required' }}
                />
              </td>
              <td className="border-none">
                <NumberField
                  name={`price_based_cost.${index}.cost`}
                  placeholder="Shipping Cost"
                  required
                  validation={{ required: 'Shipping cost is required' }}
                />
              </td>
              <td className="border-none">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-critical"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border-none">
              <button
                type="button"
                className="text-interactive"
                onClick={() => {
                  append({
                    min_price: undefined,
                    cost: undefined
                  });
                }}
              >
                + Add Line
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
