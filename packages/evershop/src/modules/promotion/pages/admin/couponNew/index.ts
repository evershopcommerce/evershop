import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new coupon',
    description: 'Create a new coupon'
  });
};
