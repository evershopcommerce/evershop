import Area from '@components/common/Area';
import { Card } from '@components/common/ui/Card';
import { CardContent, CardTitle } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import PropTypes from 'prop-types';
import React from 'react';

function FullName({ fullName }) {
  return (
    <CardContent>
      <CardTitle className="mb-2">{_('Full Name')}</CardTitle>
      <div>
        <span>{fullName}</span>
      </div>
    </CardContent>
  );
}

FullName.propTypes = {
  fullName: PropTypes.string.isRequired
};

function Group({ group }) {
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle className="mb-2">{_('Group')}</CardTitle>
      <div>
        <span>{group?.groupName || _('Default')}</span>
      </div>
    </CardContent>
  );
}

Group.propTypes = {
  group: PropTypes.shape({
    groupName: PropTypes.string
  }).isRequired
};

function Email({ email }) {
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle className="mb-2">{_('Email')}</CardTitle>
      <div>
        <span>{email}</span>
      </div>
    </CardContent>
  );
}

Email.propTypes = {
  email: PropTypes.string.isRequired
};

function Status({ status }) {
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle className="mb-2">{_('Status')}</CardTitle>
      <div>
        <span>{parseInt(status, 10) === 1 ? _('Enabled') : _('Disabled')}</span>
      </div>
    </CardContent>
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
        className="space-y-3"
        coreComponents={[
          {
            component: {
              default: () => <FullName fullName={customer.fullName} />
            },
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
    email: PropTypes.string,
    fullName: PropTypes.string,
    group: PropTypes.shape({
      groupName: PropTypes.string
    }),
    status: PropTypes.number
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
