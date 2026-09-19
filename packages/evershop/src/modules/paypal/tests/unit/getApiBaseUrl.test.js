process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { getApiBaseUrl } from '../../services/getApiBaseUrl.js';

/**
 * Regression for the ignored `system.paypal.environment` config override.
 * The requester honored config for clientId/clientSecret but the base URL
 * only ever read the `paypalEnvironment` DB setting — so a store configured
 * for live via config.json displayed the live URL in admin (the GraphQL
 * resolver DOES honor config) while every API call silently went to the
 * sandbox default. Config must win over the setting, same precedence as the
 * credentials.
 */
describe('getApiBaseUrl', () => {
  it('honors system.paypal.environment from config before the DB setting', async () => {
    config.util.setModuleDefaults('system', {
      paypal: {
        environment: 'https://api-m.paypal.com'
      }
    });
    await expect(getApiBaseUrl()).resolves.toBe('https://api-m.paypal.com');
  });
});
