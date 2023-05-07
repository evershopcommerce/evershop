import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '@components/common/context/app';
import { Card } from '@components/admin/cms/Card';

export default function BestCustomers({ listUrl }) {
  const context = useAppState();
  const currency = context.currency || 'USD';
  const customers = context.bestCustomers || [];

  return (
    <Card
      title="Best customers"
      actions={[
        {
          name: 'All customers',
          onAction: () => {
            window.location.href = listUrl;
          }
        }
      ]}
    >
      <Card.Session>
        <table className="listing">
          <thead>
            <tr>
              <th>Full name</th>
              <th>Orders</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              const grandTotal = new Intl.NumberFormat('en', {
                style: 'currency',
                currency
              }).format(c.total);
              return (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td>
                    <a href={c.editUrl || ''}>{c.full_name}</a>
                  </td>
                  <td>{c.orders}</td>
                  <td>{grandTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card.Session>
    </Card>
  );
}

BestCustomers.propTypes = {
  listUrl: PropTypes.string.isRequired
};
