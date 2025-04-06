import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Payment Setting',
    description: 'Payment Setting'
  });
};
