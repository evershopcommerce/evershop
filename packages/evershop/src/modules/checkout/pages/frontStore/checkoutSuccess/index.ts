import { select } from '@evershop/postgres-query-builder';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request: EvershopRequest, response, next) => {
  const { orderId } = request.params;
  const order = await select()
    .from('order')
    .where('uuid', '=', orderId)
    .and('sid', '=', request.sessionID || '')
    .load(pool);
  if (!order) {
    response.redirect(302, buildUrl('homepage'));
    return;
  } else {
    setPageMetaInfo(request, {
      title: translate('Checkout success'),
      description: translate('Checkout success')
    });
    setContextValue(request, 'orderId', order.uuid);
    next();
  }
};
