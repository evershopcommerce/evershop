import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new cms page',
    description: 'Create a new cms page'
  });
};
