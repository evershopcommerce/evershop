import { describe, expect, it, jest } from '@jest/globals';

/**
 * The welcome email's template data never holds the password hash, also for
 * a `customer_registered` event saved before customer migration 1.0.7 (or
 * written by an older extension) that still carries it.
 */

const sent: Array<{ type: string; args: Record<string, any> }> = [];

jest.unstable_mockModule('../../../../lib/mail/emailHelper.js', () => ({
  sendEmail: async (type: string, args: Record<string, any>) => {
    sent.push({ type, args });
  },
  buildEmailBodyFromTemplate: async () => ''
}));
// Every export of the settings module: other modules this one imports read some
const settings = {
  getSetting: async (_name: string, fallback: unknown) => fallback,
  getSettingSync: (_name: string, fallback: unknown) => fallback,
  refreshSetting: async () => undefined,
  getStoreLanguage: async () => 'en',
  getStoreLanguageSync: () => 'en',
  getEnabledLanguages: async () => ['en'],
  getAdditionalLanguages: async () => [],
  getAdminLanguage: async () => 'en',
  getStoreCurrency: async () => 'USD',
  getStoreTimezone: async () => 'UTC'
};
const text = async () => '';
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  ...settings,
  getStoreName: text,
  getStoreDescription: text,
  getWeightUnit: async () => 'kg',
  getDimensionUnit: async () => 'cm',
  getStoreEmail: text,
  getStorePhoneNumber: text,
  getStoreCountry: text,
  getStoreProvince: text,
  getStoreCity: text,
  getStoreAddress: text,
  getStorePostalCode: text
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: () => undefined,
  error: (e: unknown) => {
    throw e;
  }
}));

const { default: sendWelcomeEmail } = await import(
  '../../subscribers/customer_registered/sendWelcomeEmail.js'
);

describe('welcome email', () => {
  it('leaves the password hash out of the template data and the registry context', async () => {
    await sendWelcomeEmail({
      customer_id: 7,
      uuid: 'u-7',
      email: 'jane@example.com',
      full_name: 'Jane',
      status: 1,
      group_id: 1,
      password: '$2a$10$hashhashhash'
    } as never);
    expect(sent).toHaveLength(1);
    expect(sent[0].args.to).toBe('jane@example.com');
    expect(sent[0].args.data.customer).toMatchObject({ email: 'jane@example.com', full_name: 'Jane' });
    expect(JSON.stringify(sent[0].args)).not.toContain('hashhashhash');
  });
});
