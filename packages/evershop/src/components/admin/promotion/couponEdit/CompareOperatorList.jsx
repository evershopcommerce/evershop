export const compareOperatorList = [
  {
    key: '=',
    label: 'Equal',
    allowKeys: ['price']
  },
  {
    key: '!=',
    label: 'Not equal',
    allowKeys: ['price']
  },
  {
    key: '>',
    label: 'Greater',
    allowKeys: ['price']
  },
  {
    key: '>=',
    label: 'Greater or equal',
    allowKeys: ['price']
  },
  {
    key: '<',
    label: 'Smaller',
    allowKeys: ['price']
  },
  {
    key: '<=',
    label: 'Equal or smaller',
    allowKeys: ['price']
  },
  {
    key: 'IN',
    label: 'In',
    allowKeys: ['category', 'collection', 'attribute_group', 'sku']
  },
  {
    key: 'NOT IN',
    label: 'Not in',
    allowKeys: ['category', 'collection', 'attribute_group', 'sku']
  }
];
