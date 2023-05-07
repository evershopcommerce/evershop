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
            default: () => (
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
            value: condition.emails ? condition.emails : '',
            instruction: 'Use comma when you have multi email'
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
