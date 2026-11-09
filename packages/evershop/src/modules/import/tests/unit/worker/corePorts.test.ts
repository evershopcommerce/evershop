import { afterEach, describe, expect, it, jest } from '@jest/globals';
import config from 'config';

/**
 * The addresses the import counts as the store's own file storage (IMG-06): an
 * image that is already there is kept as it is and not copied onto itself. The
 * store's own address is the one core uses everywhere: `EVERSHOP_HOME_URL`, then
 * `shop.homeUrl`.
 */
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

// The route table is not loaded in a unit test: `/assets/<path>` is where the
// local storage serves its files.
jest.unstable_mockModule('../../../../../lib/router/buildUrl.js', () => ({
  buildUrl: () => '/assets/x',
  buildAbsoluteUrl: () => 'http://localhost/assets/x'
}));

const { ownStorageBases } = await import('../../../worker/corePorts.js');
const { isOwnStorageUrl } = await import(
  '../../../services/images/ownStorage.js'
);

const setHome = (homeUrl: string | undefined) => {
  (config as unknown as { util: { extendDeep: Function } }).util.extendDeep(
    config,
    { shop: { homeUrl } }
  );
};

afterEach(() => {
  delete process.env.EVERSHOP_HOME_URL;
  setHome(undefined);
});

describe('ownStorageBases', () => {
  it('counts the address the store answers to, `EVERSHOP_HOME_URL` first (core reads it before `shop.homeUrl`)', () => {
    process.env.EVERSHOP_HOME_URL = 'https://shop.example.com/';
    const bases = ownStorageBases();
    expect(bases).toContain('https://shop.example.com/assets/');
    expect(
      isOwnStorageUrl(
        'https://shop.example.com/assets/catalog/12/34/tee.png',
        bases
      )
    ).toBe(true);
    expect(
      isOwnStorageUrl(
        'https://other.example.com/assets/catalog/12/34/tee.png',
        bases
      )
    ).toBe(false);
  });

  it('counts the configured address as well when the override differs from it', () => {
    setHome('https://www.example.com');
    process.env.EVERSHOP_HOME_URL = 'https://shop.example.com';
    const bases = ownStorageBases();
    expect(bases).toEqual(
      expect.arrayContaining([
        'https://shop.example.com/assets/',
        'https://www.example.com/assets/'
      ])
    );
  });

  it('counts the configured address when there is no override', () => {
    setHome('https://www.example.com');
    expect(ownStorageBases()).toContain('https://www.example.com/assets/');
  });
});
