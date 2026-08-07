import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { StorefrontRequest } from '../../../../../types/request.js';
import { StorefrontResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request: StorefrontRequest, response: StorefrontResponse, next) => {
  if (request.getCurrentCustomer()) {
    response.redirect(buildUrl('homepage'));
  } else {
    setPageMetaInfo(request, {
      title: translate('Create an account'),
      description: translate('Create an account')
    });
    next();
  }
};
