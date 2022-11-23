import React from 'react';
import PropTypes from 'prop-types';

export function Transactions({ transactions }) {
  const paidAmount = '';
  transactions.forEach(transaction => {
    if (transaction.transactionType.toUpperCase() === 'CAPTURE') {
      paidAmount = transaction.amount.text; // TODO: How about partial captures?
    }
  });

  return (
    <div className="flex justify-between">
      <div className="self-center">
        <span>Paid by customer</span>
      </div>
      <div className="self-center">
        <span>{paidAmount ? paidAmount : 0}</span>
      </div>
    </div>
  );
}

Transactions.propTypes = {
  transactions: PropTypes.arrayOf(PropTypes.shape({
    amount: PropTypes.shape({
      text: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired
    }),
    createdAt: PropTypes.string.isRequired,
    transactionType: PropTypes.string.isRequired,
    paymentAction: PropTypes.string.isRequired
  }))
};

Transactions.defaultProps = {
  transactions: []
};