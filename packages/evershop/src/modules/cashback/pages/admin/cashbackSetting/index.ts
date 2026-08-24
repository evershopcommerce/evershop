import { translate } from '../../../../../lib/locale/translate/translate.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request: any, response: EvershopResponse, next: any) => {
  setPageMetaInfo(request, {
    title: translate('Cashback Settings'),
    description: translate('Configure Cashback & Rebate settings')
  });
  next();
};
