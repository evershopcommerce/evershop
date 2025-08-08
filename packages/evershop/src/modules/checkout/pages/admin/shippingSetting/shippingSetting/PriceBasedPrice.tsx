import { NumberField } from '@components/common/form/NumberField.js';
import React from 'react';

export interface PriceBasedPriceProps {
  lines: Array<{
    minPrice: { value: number };
    cost: { value: number };
    key?: string;
  }>;
}

export function PriceBasedPrice({ lines }: PriceBasedPriceProps) {
  const [rows, setRows] = React.useState(
    lines.map((line) => ({
      ...line,
      key: Math.random().toString(36).substring(7)
    }))
  );
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
          {rows.map((row, index) => (
            <tr key={row.key} className="border-divider py-5">
              <td className="border-none">
                <NumberField
                  name={`price_based_cost.${index}.min_price`}
                  placeholder="Min Price"
                  defaultValue={row.minPrice?.value}
                  required
                  validation={{ required: 'Min price is required' }}
                />
              </td>
              <td className="border-none">
                <NumberField
                  name={`price_based_cost.${index}.cost`}
                  placeholder="Shipping Cost"
                  defaultValue={row.cost?.value}
                  required
                  validation={{ required: 'Shipping cost is required' }}
                />
              </td>
              <td className="border-none">
                <a
                  href="#"
                  onClick={() => {
                    setRows(rows.filter((r) => r.key !== row.key));
                  }}
                  className="text-critical"
                >
                  Delete
                </a>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border-none">
              <a
                href="#"
                className="text-interactive"
                onClick={() => {
                  setRows([
                    ...rows,
                    {
                      minPrice: { value: 0 },
                      cost: { value: 0 },
                      key: Math.random().toString(36).substring(7)
                    }
                  ]);
                }}
              >
                + Add Line
              </a>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
