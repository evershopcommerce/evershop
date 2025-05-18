import { Card } from '@components/admin/cms/Card';
import { useAppState } from '@components/common/context/app';
import PropTypes from 'prop-types';
import React from 'react';

export default function BestCustomers({ listUrl, setting }) {
  const context = useAppState();
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
                currency: setting.storeCurrency
              }).format(c.total);
              return (
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
  setting: PropTypes.shape({
    storeCurrency: PropTypes.string
  }).isRequired,
  listUrl: PropTypes.string.isRequired
};

export const query = `
  query Query {
    setting {
      storeCurrency
    }
    listUrl: url(routeId: "productGrid")
  }
`;
