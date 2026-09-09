import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request: any, response: EvershopResponse, next: any) => {
  const isPageBuilderPreview =
    typeof request.query?.changeset === 'string' &&
    String(request.query.changeset).length > 0;

  if (!isPageBuilderPreview && !request.isCustomerLoggedIn()) {
    response.redirect(buildUrl('login'));
  } else {
    setPageMetaInfo(request, {
      title: translate('My Cashback Balance'),
      description: translate('View earned cashback balance and transactions')
    });
    next();
  }
};
