import { setPageMetaInfo } from 'src/modules/cms/services/pageMetaInfo.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: translate('Shopping cart'),
    description: translate('Shopping cart')
  });
};
