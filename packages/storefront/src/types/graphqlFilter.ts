export type GraphQLFilter = {
  key: string;
  operation: GraphQLFilterOperation;
  value: any;
};
export type GraphQLFilterOperation =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'nlike';
