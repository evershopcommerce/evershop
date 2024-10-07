import PropTypes from 'prop-types';
import React from 'react';
import EmailIcon from '@heroicons/react/outline/MailIcon';
import User from '@heroicons/react/outline/UserIcon';
import Area from '@components/common/Area';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function AccountDetails({ account }) {
  return (
    <div className="account-details">
      <div className="account-details-inner">
        <div className="grid grid-cols-1 gap-4">
          <Area
            id="accountDetails"
            coreComponents={[
              {
                component: {
                  default: () => (
                    <div className="account-details-name flex gap-4">
                      <div>
                        <User width={20} height={20} />
                      </div>
                      <div>{account.fullName}</div>
                    </div>
                  )
                },
                sortOrder: 10
              },
              {
                component: {
                  default: () => (
                    <div className="account-details-email flex gap-4">
                      <div>
                        <EmailIcon width={20} height={20} />
                      </div>
                      <div>{account.email}</div>
                    </div>
                  )
                },
                sortOrder: 15
              }
            ]}
          />
          <a href="#" className="text-interactive underline italic">
            {_('Edit')}
          </a>
        </div>
      </div>
    </div>
  );
}

AccountDetails.propTypes = {
  account: PropTypes.shape({
    email: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'accountPageRight',
  sortOrder: 10
};

export const query = `
  query Query {
    account: currentCustomer {
      uuid
      fullName
      email
    }
  }
`;
