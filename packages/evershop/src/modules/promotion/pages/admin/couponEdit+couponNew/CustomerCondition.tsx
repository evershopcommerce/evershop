import Area from '@components/common/Area.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { ReactSelectCreatableField } from '@components/common/form/ReactSelectCreatableField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import React from 'react';
import { Coupon } from './General.js';

const customStyles = {
  container: (provided) => ({
    ...provided,
    zIndex: 1000
  })
};

interface CustomerConditionProps {
  coupon?: Coupon;
  groups: {
    items: {
      value: number;
      name: string;
    }[];
  };
}

export default function CustomerCondition({
  coupon,
  groups: { items: customerGroups }
}: CustomerConditionProps) {
  const condition = coupon?.userCondition;
  const selectedGroups = condition?.groups || [];

  return (
    <Area
      id="couponCustomerCondition"
      coreComponents={[
        {
          component: {
            default: () => (
              <ReactSelectField
                label="Customer groups"
                name="user_condition.groups"
                options={customerGroups.map((group) => ({
                  value: group.value.toString(),
                  label: group.name
                }))}
                hideSelectedOptions
                isMulti={true}
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
          component: {
            default: (
              <ReactSelectCreatableField
                name="user_condition.emails"
                label="Customer emails"
                placeholder="Enter customer emails"
                isMulti={true}
                options={(condition?.emails || []).map((email) => ({
                  value: email as string,
                  label: email as string
                }))}
                defaultValue={condition?.emails || []}
              />
            )
          },
          sortOrder: 20,
          id: 'couponCustomerConditionEmail'
        },
        {
          component: {
            default: (
              <NumberField
                label="Customer's purchase"
                placeholder="Enter purchased amount"
                defaultValue={condition?.purchased || 0}
                name="user_condition.purchased"
                min={0}
                helperText="Minimum purchased amount. This only applies to registered customers."
              />
            )
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
      items {
        value: customerGroupId
        name: groupName
      }
    }
  }
`;
