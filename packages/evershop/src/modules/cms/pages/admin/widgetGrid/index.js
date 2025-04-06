import { buildFilterFromUrl } from '@evershop/evershop/src/lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

// eslint-disable-next-line no-unused-vars
export default (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Widgets',
    description: 'Widgets'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
