import React from 'react';
import Area from "../../../../../../lib/components/Area";
import { Field } from '../../../../../../lib/components/form/Field';
import { Select } from '../../../../../../lib/components/form/fields/Select';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from "../../../../../../lib/util/get";

export function CustomerCondition() {
  const context = useAppState();
  const condition = get(context, 'coupon.user_condition', {});
  const customerGroups = get(context, 'customerGroups', []);
  const [customerGroupId, setCustomerGroupId] = React.useState(get(condition, 'groups', ''));// TODO: This should be multiselect

  return (
    <Area
      id="couponCustomerCondition"
      coreComponents={[
        {
          component: { default: Select },
          props: {
            name: 'user_condition[groups][]',
            label: 'Customer group',
            value: condition.group ? condition.group : 999,
            options: customerGroups
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
            value: condition.email ? condition.email : '',
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
            value: condition.purchased ? condition.purchased : '',
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
