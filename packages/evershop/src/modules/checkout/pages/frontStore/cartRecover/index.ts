import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import '../../../services/cartRecovery.js';

/**
 * The cart recovery link (`buildCartRecoveryUrl`). It keeps the token in the
 * session and redirects to `/cart/recover` (`cartRecoverConfirm`), which
 * checks it and gives the cart back. No page renders at a URL that holds the
 * token: analytics and pixel scripts send the page URL, so they would
 * receive it.
 */
export default (
  request: EvershopRequest,
  response: EvershopResponse,
  // Three arguments, never called: this handler ends the request. With two,
  // the framework would treat it as passive and go on to render a page.
  next: () => void
) => {
  const { token } = request.params;
  request.session.cartRecovery = {
    token: typeof token === 'string' ? token : ''
  };
  response.redirect(buildUrl('cartRecoverConfirm'));
};
