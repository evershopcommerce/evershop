import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Regression guard for fresh-install first-boot noise.
 *
 * Module bootstraps run BEFORE migrations, so on a brand-new database the
 * `setting` table does not exist when this bootstrap warms the setting cache.
 * That state is expected — the warm-up must stay non-fatal and must NOT log a
 * red error (it made every fresh install look like a crash: "relation
 * "setting" does not exist"). Postgres 42P01 (undefined_table) goes to debug;
 * any other failure (connection refused, bad credentials, …) keeps the loud
 * error path.
 */

jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

const refreshSetting = jest.fn<() => Promise<void>>();
jest.unstable_mockModule('../../services/setting.js', () => ({
  refreshSetting
}));

const bootstrap = (await import('../../bootstrap.js')).default;
const { debug, error } = await import('../../../../lib/log/logger.js');

describe('setting bootstrap (cache warm-up)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warms the setting cache and logs nothing on success', async () => {
    refreshSetting.mockResolvedValue(undefined);

    await bootstrap();

    expect(refreshSetting).toHaveBeenCalledTimes(1);
    expect(debug).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('logs 42P01 (missing setting table on a fresh install) at debug, not error', async () => {
    refreshSetting.mockRejectedValue(
      Object.assign(new Error('relation "setting" does not exist'), {
        code: '42P01'
      })
    );

    await expect(bootstrap()).resolves.toBeUndefined();

    expect(debug).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('logs any other failure at error level', async () => {
    refreshSetting.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
        code: 'ECONNREFUSED'
      })
    );

    await expect(bootstrap()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(debug).not.toHaveBeenCalled();
  });

  it('stays non-fatal for errors with no code at all', async () => {
    refreshSetting.mockRejectedValue(new Error('boom'));

    await expect(bootstrap()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
  });
});
