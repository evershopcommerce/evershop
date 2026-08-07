import { getSetting } from '../../setting/services/setting.js';

export async function getApiBaseUrl() {
  const url = await getSetting(
    'paypalEnvironment',
    'https://api-m.sandbox.paypal.com'
  );
  return url;
}
