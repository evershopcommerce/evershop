import PropTypes from 'prop-types';
import React from 'react';

export default function OrderSummary({
  number, tax, discount, grandTotal
}) {
  return (
    <div className="order-success-summary">
      <table className="table">
        <thead>
          <tr>
            <th><span>Order number</span></th>
            <th><span>{number}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span>Tax</span></td>
            <td><span>{tax}</span></td>
          </tr>
          <tr>
            <td><span>Discount</span></td>
            <td><span>{discount}</span></td>
          </tr>
          <tr>
            <td><span>Total</span></td>
            <td><span>{grandTotal}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

OrderSummary.propTypes = {
  discount: PropTypes.number.isRequired,
  grandTotal: PropTypes.number.isRequired,
  number: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired
};
