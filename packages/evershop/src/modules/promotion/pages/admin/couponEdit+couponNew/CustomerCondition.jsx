import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';

const customStyles = {
  container: (provided) => ({
    ...provided,
    zIndex: 1000
  })
};

export default function CustomerCondition({ coupon = {}, groups }) {
  const condition = coupon?.userCondition || {};
  const selectedGroups = (condition.groups || [])
    .filter((g) =>
      groups.find((group) => parseInt(group.value, 10) === parseInt(g, 10))
    )
    .map((g) => {
      const group = groups.find(
        (e) => parseInt(e.value, 10) === parseInt(g, 10)
      );
      return {
        value: group.value.toString(),
        label: group.name
      };
    });
  return (
    <Area
      id="couponCustomerCondition"
      coreComponents={[
        {
          component: {
            // eslint-disable-next-line react/no-unstable-nested-components
            default: (
              <Select
                name="user_condition[groups][]"
                options={groups.map((group) => ({
                  value: group.value.toString(),
                  label: group.name
                }))}
                hideSelectedOptions
                isMulti
                defaultValue={selectedGroups}
                styles={customStyles}
              />
            )
          },
          props: {},
          sortOrder: 10,
          id: 'couponCustomerConditionGroup'
        },
        {
          component: { default: Field },
          props: {
            type: 'input',
            name: 'user_condition[emails]',
            label: 'Customer email (empty for all)',
            placeholder: 'Enter customer emails',
            value: condition.emails ? condition.emails : '',
            instruction: 'Use comma when you have multi email',
            suffix: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                style={{ width: '1.8rem', height: '1.8rem' }}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            )
          },
          sortOrder: 20,
          id: 'couponCustomerConditionEmail'
        },
        {
          component: { default: Field },
          props: {
            type: 'input',
            name: 'user_condition[purchased]',
            label: "Customer's purchase",
            placeholder: 'Enter purchased amount',
            value: condition.purchased || null,
            validationRules: ['number'],
            instruction: 'Minimum purchased amount'
          },
          sortOrder: 30,
          id: 'couponCustomerConditionPurchased'
        }
      ]}
    />
  );
}

CustomerCondition.propTypes = {
  coupon: PropTypes.shape({
    userCondition: PropTypes.shape({
      groups: PropTypes.arrayOf(PropTypes.number),
      emails: PropTypes.string,
      purchased: PropTypes.number
    })
  }),
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number,
      name: PropTypes.string
    })
  )
};

CustomerCondition.defaultProps = {
  coupon: {},
  groups: []
};

export const layout = {
  areaId: 'couponEditRight',
  sortOrder: 10
};

export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      userCondition {
        groups
        emails
        purchased
      }
    }
    groups: customerGroups {
      value: customerGroupId
      name: groupName
    }
  }
`;
