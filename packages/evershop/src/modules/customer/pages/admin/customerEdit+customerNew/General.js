import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Card } from '../../../../cms/components/admin/Card';

function FullName({ fullName }) {
  return <Card.Session title="Full Name"><div><span>{fullName}</span></div></Card.Session>;
}
function Group({ group }) {
  return <Card.Session title="Group"><div><span>{group?.groupName || 'Default'}</span></div></Card.Session>;
}
function Email({ email }) {
  return <Card.Session title="Email"><div><span>{email}</span></div></Card.Session>;
}
function Status({ status }) {
  return <Card.Session title="Status"><div><span>{status == 1 ? 'Enabled' : 'Disabled'}</span></div></Card.Session>;
}

export default function General({
  customer
}) {
  return (
    <Card>
      <Area
        id="customerEditInformation"
        coreComponents={[
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
        ]}
      />
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
};

export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      customerId
      fullName
      email
      status
      group {
        groupName
      }
    }
  }
`;
