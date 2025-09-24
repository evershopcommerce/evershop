import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: translate('Shopping cart'),
    description: translate('Shopping cart')
  });
};
