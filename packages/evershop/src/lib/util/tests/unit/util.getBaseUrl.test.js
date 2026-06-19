/**
 * @jest-environment node
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals';

// `undefined` => the getConfig mock returns the default argument passed by
// getBaseUrl (i.e. the localhost fallback). Any string => that config value.
let mockConfigValue;

await jest.unstable_mockModule('../../getConfig.js', () => ({
  getConfig: (_path, def) => (mockConfigValue !== undefined ? mockConfigValue : def)
}));

const { getBaseUrl, assertValidHomeUrlEnv, HOME_URL_ENV } = await import(
  '../../getBaseUrl.js'
);

const ORIGINAL_ENV = process.env[HOME_URL_ENV];
const restoreEnv = () => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env[HOME_URL_ENV];
  } else {
    process.env[HOME_URL_ENV] = ORIGINAL_ENV;
  }
};

describe('getBaseUrl — EVERSHOP_HOME_URL override precedence', () => {
  beforeEach(() => {
    mockConfigValue = undefined;
    delete process.env[HOME_URL_ENV];
  });
  afterEach(restoreEnv);

  it('uses the env var when set (highest precedence)', () => {
    mockConfigValue = 'https://from-config.example.com';
    process.env[HOME_URL_ENV] = 'https://from-env.example.com';
    expect(getBaseUrl()).toBe('https://from-env.example.com');
  });

  it('falls back to config when env is unset', () => {
    mockConfigValue = 'https://from-config.example.com';
    expect(getBaseUrl()).toBe('https://from-config.example.com');
  });

  it('treats whitespace-only env as unset and falls back to config', () => {
    mockConfigValue = 'https://from-config.example.com';
    process.env[HOME_URL_ENV] = '   ';
    expect(getBaseUrl()).toBe('https://from-config.example.com');
  });

  it('falls back to http://localhost:<port> when neither env nor config is set', () => {
    expect(getBaseUrl()).toMatch(/^http:\/\/localhost:\d+$/);
  });

  it('strips trailing slashes from the env value', () => {
    process.env[HOME_URL_ENV] = 'https://from-env.example.com///';
    expect(getBaseUrl()).toBe('https://from-env.example.com');
  });
});

describe('assertValidHomeUrlEnv — boot guard', () => {
  beforeEach(() => {
    delete process.env[HOME_URL_ENV];
  });
  afterEach(restoreEnv);

  it('does not throw when the env var is unset', () => {
    expect(() => assertValidHomeUrlEnv()).not.toThrow();
  });

  it('does not throw when the env var is empty/whitespace', () => {
    process.env[HOME_URL_ENV] = '  ';
    expect(() => assertValidHomeUrlEnv()).not.toThrow();
  });

  it('accepts a valid https URL', () => {
    process.env[HOME_URL_ENV] = 'https://example.com';
    expect(() => assertValidHomeUrlEnv()).not.toThrow();
  });

  it('accepts a valid http URL with a port', () => {
    process.env[HOME_URL_ENV] = 'http://localhost:3000';
    expect(() => assertValidHomeUrlEnv()).not.toThrow();
  });

  it('throws for a non-URL string', () => {
    process.env[HOME_URL_ENV] = 'not a url';
    expect(() => assertValidHomeUrlEnv()).toThrow(/not a valid URL/);
  });

  it('throws for a non-http(s) protocol', () => {
    process.env[HOME_URL_ENV] = 'ftp://example.com';
    expect(() => assertValidHomeUrlEnv()).toThrow(/http or https/);
  });
});
