import PropTypes from "prop-types";
import React from 'react';
import Area from "../../../../../../lib/components/Area";
import { Input } from "../../../../../../lib/components/form/fields/Input";
import { Select } from "../../../../../../lib/components/form/fields/Select";
import { useAppState } from '../../../../../../lib/context/app';
import { get } from "../../../../../../lib/util/get";

export function CustomerCondition({ group, email, purchased }) {
  const context = useAppState();
  const customerGroups = get(context, 'customerGroups', []);
  return (
    <Area
      id="couponCustomerCondition"
      coreComponents={[
        {
          component: { default: Select },
          props: {
            name: 'user_condition[group]',
            label: 'Customer group',
            value: group ? group : 999,
            options: customerGroups
          },
          sortOrder: 10,
          id: 'couponCustomerConditionGroup'
        },
        {
          component: { default: Input },
          props: {
            name: 'user_condition[email]',
            label: 'Customer email',
            value: email ? email : '',
            validationRules: ['email'],
            comment: 'Use comma when you have multi email'
          },
          sortOrder: 20,
          id: 'couponCustomerConditionEmail'
        },
        {
          component: { default: Input },
          props: {
            name: 'user_condition[purchased]',
            label: "Customer's purchase",
            value: purchased ? purchased : '',
            validationRules: ['number'],
            comment: 'Minimum purchased amount'
          },
          sortOrder: 30,
          id: 'couponCustomerConditionPurchased'
        }
      ]}
    />
  );
}

CustomerCondition.propTypes = {
  customerGroups: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string
  })),
  email: PropTypes.string,
  group: PropTypes.string,
  purchased: PropTypes.bool
}

CustomerCondition.defaultProps = {
  customerGroups: []
};
