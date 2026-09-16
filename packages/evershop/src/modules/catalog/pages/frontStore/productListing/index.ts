import { translate } from '../../../../../lib/locale/translate/translate.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

/**
 * The all-products listing. There is no entity to load — the route IS the whole
 * catalog — so unlike categoryView this has no 404 branch and sets nothing on
 * the GraphQL context: `Query.productListing` gates on the route id and reads
 * its filters straight off the URL.
 */
export default (request: EvershopRequest, response, next) => {
  setPageMetaInfo(request, {
    title: translate('All products'),
    description: translate('All products')
  });
  next();
};
