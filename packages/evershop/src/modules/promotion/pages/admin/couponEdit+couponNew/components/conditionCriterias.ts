export enum Operator {
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER = '>',
  GREATER_OR_EQUAL = '>=',
  SMALLER = '<',
  SMALLER_OR_EQUAL = '<=',
  IN = 'IN',
  NOT_IN = 'NOT IN'
}

export type ConditionKey = {
  key: string;
  label: string;
};

export type OperatorOption = {
  key: Operator;
  label: string;
};

const options: ConditionKey[] = [
  {
    key: 'category',
    label: 'Category'
  },
  {
    key: 'collection',
    label: 'Collection'
  },
  {
    key: 'attribute_group',
    label: 'Attribute Group'
  },
  {
    key: 'sku',
    label: 'Sku'
  },
  {
    key: 'price',
    label: 'Price'
  }
];

const operators: OperatorOption[] = [
  {
    key: Operator.EQUAL,
    label: 'Equal'
  },
  {
    key: Operator.NOT_EQUAL,
    label: 'Not equal'
  },
  {
    key: Operator.GREATER,
    label: 'Greater'
  },
  {
    key: Operator.GREATER_OR_EQUAL,
    label: 'Greater or equal'
  },
  {
    key: Operator.SMALLER,
    label: 'Smaller'
  },
  {
    key: Operator.SMALLER_OR_EQUAL,
    label: 'Equal or smaller'
  },
  {
    key: Operator.IN,
    label: 'In'
  },
  {
    key: Operator.NOT_IN,
    label: 'Not in'
  }
];

export { options, operators };
