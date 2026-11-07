import { translate } from '../../../../../lib/locale/translate/translate.js';
import { error } from '../../../../../lib/log/logger.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import {
  decideCartRecovery,
  restoreCart,
  savedCartItems
} from '../../../services/cartRecovery.js';

/**
 * `/cart/recover`: the cart recovery link the visitor opened (`cartRecover`
 * keeps its token in the session).
 *
 * - GET never changes anything (email scanners open links, a link works
 *   once): a valid link shows the saved cart's products and a "Restore my
 *   cart" button, which POSTs here.
 * - POST restores (`restoreCart`) and goes to the cart page. The session then
 *   remembers it, so Back, a reload, or the login page's background request
 *   go to the cart page too, not to "no longer valid".
 * - A link used already (its cart was restored): the page says so, with a
 *   button to the cart; a POST goes to the cart page.
 * - A customer's cart and the visitor is not signed in: to the login page,
 *   which comes back here.
 * - Anything else: the page says the link is no longer valid, without the
 *   reason.
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: () => void
) => {
  let status: 'ready' | 'restored' | 'invalid' = 'invalid';
  try {
    const recovery = request.session.cartRecovery;
    if (recovery?.restored && !recovery.token) {
      response.redirect(buildUrl('cart'));
      return;
    }
    const visitor = {
      sessionId: request.sessionID,
      customer: request.getCurrentCustomer() ?? null
    };
    const decision = await decideCartRecovery(recovery?.token, visitor);
    if (decision.action === 'login') {
      response.redirect(
        `${buildUrl('login')}?redirect=${encodeURIComponent(
          buildUrl('cartRecoverConfirm')
        )}`
      );
      return;
    }
    if (decision.action === 'restored') {
      delete request.session.cartRecovery;
      if (request.method === 'POST') {
        // A second click, or another tab restored it a moment ago
        response.redirect(buildUrl('cart'));
        return;
      }
      status = 'restored';
    }
    if (decision.action === 'ready') {
      if (request.method === 'POST') {
        await restoreCart(decision.cart, visitor, { request });
        request.session.cartRecovery = { restored: true };
        response.redirect(buildUrl('cart'));
        return;
      }
      status = 'ready';
      setContextValue(
        request,
        'cartRecoveryItems',
        await savedCartItems(decision.cart)
      );
    }
  } catch (e) {
    error(e);
  }
  if (status === 'invalid') {
    delete request.session.cartRecovery;
    if (request.method === 'POST') {
      response.redirect(buildUrl('cartRecoverConfirm'));
      return;
    }
  }
  setContextValue(request, 'cartRecoveryStatus', status);
  const title = {
    ready: translate('Restore your cart'),
    restored: translate('This cart was already restored'),
    invalid: translate('This cart link is no longer valid')
  }[status];
  setPageMetaInfo(request, { title, description: title });
  next();
};
