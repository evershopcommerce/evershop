import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Store Setting',
    description: 'Store Setting'
  });
};
