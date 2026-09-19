import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';

export default (request: EvershopRequest, response) => {
  setPageMetaInfo(request, {
    title: 'Contact messages',
    description: 'Messages sent through the contact form widget'
  });
  setContextValue(
    request,
    'filtersFromUrl',
    buildFilterFromUrl(request.originalUrl)
  );
};
