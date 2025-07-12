import { EvershopRequest } from '@evershop/evershop';
import { setContextValue } from '@evershop/evershop/graphql/services';

export default (request: EvershopRequest) => {
  setContextValue(request, 'pageInfo', {
    title: 'Age verification failed',
    description: 'Age verification failed'
  });
};
