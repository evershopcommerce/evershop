import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Categories',
    description: 'Categories'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
