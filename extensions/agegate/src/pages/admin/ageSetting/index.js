import { setContextValue } from '@evershop/evershop/graphql/services';

export default (request) => {
  setContextValue(request, 'pageInfo', {
    title: 'Age Setting',
    description: 'Age Setting'
  });
};
