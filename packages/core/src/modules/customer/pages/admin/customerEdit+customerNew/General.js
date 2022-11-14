import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Card } from '../../../../cms/components/admin/Card';

const FullName = ({ fullName }) => <div><span>{fullName}</span></div>
const Email = ({ email }) => <div><span>{email}</span></div>
const Status = ({ status }) => <div><span>{status == 1 ? 'Enabled' : 'Disabled'}</span></div>

export default function General({
  customer
}) {
  return (
    <Card
      title="General"
    >
      <Card.Session>
        <Area id="categoryEditGeneral" coreComponents={[
          {
            component: { default: () => <FullName fullName={customer.fullName} /> },
            sortOrder: 10
          },
          {
            component: { default: () => <Email email={customer.email} /> },
            sortOrder: 15
          },
          {
            component: { default: () => <Status status={customer.status} /> },
            sortOrder: 20
          }
        ]} />
      </Card.Session>
    </Card>
  );
}

General.propTypes = {
  customer: PropTypes.shape({
    fullName: PropTypes.string,
    email: PropTypes.string,
    status: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
}

export const query = `
  query Query {
    customer(id: getContextValue("customerId", null)) {
      customerId
      fullName
      email
      status
    }
  }
`;