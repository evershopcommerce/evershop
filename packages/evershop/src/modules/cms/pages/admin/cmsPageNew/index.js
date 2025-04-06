import { setContextValue } from '../../../../graphql/services/contextHelper.js';

// eslint-disable-next-line no-unused-vars
export default (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Create a new cms page',
    description: 'Create a new cms page'
  });
};
