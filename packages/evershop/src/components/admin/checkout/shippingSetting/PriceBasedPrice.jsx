import { Field } from '@components/common/form/Field';
import PropTypes from 'prop-types';
import React from 'react';

export default function PriceBasedPrice({ lines }) {
  // This is a table with 3 columns: Min Price, Shipping Cost, and Action
  const [rows, setRows] = React.useState(
    lines.map((line) => ({
      ...line,
      key: Math.random().toString(36).substring(7)
    }))
  );
  return (
    <div className="my-8">
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
            // Create a random key for each row
            <tr key={row.key} className="border-divider py-8">
              <td className="border-none">
                <Field
                  name={`price_based_cost[${index}][min_price]`}
                  placeholder="Min Price"
                  type="text"
                  value={row.minPrice?.value}
                  validationRules={['notEmpty', 'number']}
                />
              </td>
              <td className="border-none">
                <Field
                  name={`price_based_cost[${index}][cost]`}
                  placeholder="Shipping Cost"
                  type="text"
                  value={row.cost?.value}
                  validationRules={['notEmpty', 'number']}
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
            <td colSpan="3" className="border-none">
              <a
                href="#"
                className="text-interactive"
                onClick={() => {
                  setRows([
                    ...rows,
                    {
                      min_price: '',
                      shipping_cost: '',
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

PriceBasedPrice.propTypes = {
  lines: PropTypes.arrayOf(
    PropTypes.shape({
      minPrice: PropTypes.shape({
        value: PropTypes.number.isRequired
      }),
      cost: PropTypes.shape({
        value: PropTypes.number.isRequired
      })
    })
  )
};

PriceBasedPrice.defaultProps = {
  lines: []
};
