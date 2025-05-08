import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: 'Cms pages',
    description: 'Cms pages'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request));
};
