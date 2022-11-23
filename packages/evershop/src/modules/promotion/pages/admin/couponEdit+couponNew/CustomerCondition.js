import React from 'react';
import Area from '../../../../../lib/components/Area';
import { Field } from '../../../../../lib/components/form/Field';
import { get } from '../../../../../lib/util/get';
import Select from 'react-select';

const customStyles = {
  container: (provided, state) => ({
    ...provided,
    zIndex: 1000,
  })
}

export default function CustomerCondition({ coupon = {}, groups }) {
  const condition = coupon?.userCondition || {};
  const selectedGroups = (condition.groups || [])
    .filter((g) => groups.find((group) => parseInt(group.value) === parseInt(g)))
    .map(g => {
      const group = groups.find((group) => parseInt(group.value) === parseInt(g));
      return {
        value: group.value.toString(),
        label: group.name
      }
    });
  return (
    <Area
      id="couponCustomerCondition"
      coreComponents={[
        {
          component: {
            default: () => <Select
              name='user_condition[groups][]'
              options={groups.map(group => ({
                value: group.value.toString(),
                label: group.name
              }))}
              hideSelectedOptions={true}
              isMulti={true}
              defaultValue={selectedGroups}
              styles={customStyles}
            />
          },
          props: {
          },
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


export const layout = {
  areaId: 'couponEditRight',
  sortOrder: 10
}

export const query = `
  query Query {
    coupon(id: getContextValue('couponId', null)) {
      userCondition {
        groups
        emails
        purchased
      }
    }
    groups: attributeGroups {
      value: attributeGroupId
      name: groupName
    }
  }
`;