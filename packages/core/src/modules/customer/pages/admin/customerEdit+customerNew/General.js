import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Card } from '../../../../cms/components/admin/Card';

const FullName = ({ fullName }) => <Card.Session title='Full Name'><div><span>{fullName}</span></div></Card.Session>
const Group = ({ group }) => <Card.Session title='Group'><div><span>{group?.name || 'Default'}</span></div></Card.Session>
const Email = ({ email }) => <Card.Session title='Email'><div><span>{email}</span></div></Card.Session>
const Status = ({ status }) => <Card.Session title='Status'><div><span>{status == 1 ? 'Enabled' : 'Disabled'}</span></div></Card.Session>

export default function General({
  customer
}) {
  return (
    <Card
    >
      <Area id="customerEditInformation" coreComponents={[
        {
          component: { default: () => <FullName fullName={customer.fullName} /> },
          sortOrder: 10
        },
        {
          component: { default: () => <Email email={customer.email} /> },
          sortOrder: 15
        },
        {
          component: { default: () => <Group group={customer.group} /> },
          sortOrder: 20
        },
        {
          component: { default: () => <Status status={customer.status} /> },
          sortOrder: 25
        }
      ]} />
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
  areaId: 'rightSide',
  sortOrder: 10
}

export const query = `
  query Query {
    customer(id: getContextValue("customerId", null)) {
      customerId
      fullName
      email
      status
      group {
        name
      }
    }
  }
`;