import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import { Card } from '@components/admin/cms/Card';

function FullName({ fullName }) {
  return (
    <Card.Session title="Full Name">
      <div>
        <span>{fullName}</span>
      </div>
    </Card.Session>
  );
}

FullName.propTypes = {
  fullName: PropTypes.string.isRequired
};

function Group({ group }) {
  return (
    <Card.Session title="Group">
      <div>
        <span>{group?.groupName || 'Default'}</span>
      </div>
    </Card.Session>
  );
}

Group.propTypes = {
  group: PropTypes.shape({
    groupName: PropTypes.string
  }).isRequired
};

function Email({ email }) {
  return (
    <Card.Session title="Email">
      <div>
        <span>{email}</span>
      </div>
    </Card.Session>
  );
}

Email.propTypes = {
  email: PropTypes.string.isRequired
};

function Status({ status }) {
  return (
    <Card.Session title="Status">
      <div>
        <span>{parseInt(status, 10) === 1 ? 'Enabled' : 'Disabled'}</span>
      </div>
    </Card.Session>
  );
}

Status.propTypes = {
  status: PropTypes.number.isRequired
};

export default function General({ customer }) {
  return (
    <Card>
      <Area
        id="customerEditInformation"
        coreComponents={[
          {
            // eslint-disable-next-line react/no-unstable-nested-components
            component: {
              default: () => <FullName fullName={customer.fullName} />
            },
            sortOrder: 10
          },
          {
            // eslint-disable-next-line react/no-unstable-nested-components
            component: { default: () => <Email email={customer.email} /> },
            sortOrder: 15
          },
          {
            // eslint-disable-next-line react/no-unstable-nested-components
            component: { default: () => <Group group={customer.group} /> },
            sortOrder: 20
          },
          {
            // eslint-disable-next-line react/no-unstable-nested-components
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
    email: PropTypes.string,
    fullName: PropTypes.string,
    group: PropTypes.shape({
      groupName: PropTypes.string
    }),
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
