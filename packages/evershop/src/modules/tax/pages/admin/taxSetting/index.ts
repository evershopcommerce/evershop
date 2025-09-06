import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Tax Setting',
    description: 'Tax Setting'
  });
};
