import { EvershopRequest, EvershopResponse } from '@evershop/evershop';
import { buildUrl } from '@evershop/evershop/lib';
/**
 * Middleware to check if the user has verified their age.
 * If not, redirect them to the age gate page.
 *
 * @param {Object} request - The request object
 * @param {Object} response - The response object
 * @param {Function} delegate - The delegate function
 * @param {Function} next - The next middleware function
 */
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  delegate,
  next: () => Promise<void>
) => {
  // Get the age verify cookie
  const ageVerifyCookie = request.cookies['age-verified'];
  if (!ageVerifyCookie || parseInt(ageVerifyCookie, 10) !== 1) {
    // Get the current route
    const { currentRoute } = request;
    if (
      currentRoute?.id === 'ageGate' ||
      currentRoute?.id === 'ageVerifyFailure'
    ) {
      return next();
    } else {
      return response.redirect(buildUrl('ageGate'));
    }
  } else {
    return next();
  }
};
