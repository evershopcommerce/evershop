import { EvershopRequest } from '@evershop/evershop';
import { setContextValue } from '@evershop/evershop/graphql/services';

export default (request: EvershopRequest) => {
  setContextValue(request, 'pageInfo', {
    title: 'Age Gate - Please verify your age to continue visiting this site',
    description: 'Age Gate - Please verify your age to continue'
  });
};
