import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Shipping Setting',
    description: 'Shipping Setting'
  });
};
