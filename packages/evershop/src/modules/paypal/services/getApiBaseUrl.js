import { getConfig } from '../../../lib/util/getConfig.js';
import { getSetting } from '../../setting/services/setting.js';

export async function getApiBaseUrl() {
  // Config wins over the admin setting, same precedence as clientId/clientSecret.
  const paypalConfig = getConfig('system.paypal', {});
  if (paypalConfig.environment) {
    return paypalConfig.environment;
  }
  const url = await getSetting(
    'paypalEnvironment',
    'https://api-m.sandbox.paypal.com'
  );
  return url;
}
