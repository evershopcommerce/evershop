import { describe, it, expect } from '@jest/globals';
import { assertWebhookUrl } from '../../services/assertWebhookUrl.js';
import { WebhookValidationError } from '../../services/errors.js';

const strict = (url: unknown) => assertWebhookUrl(url, false);
const lenient = (url: unknown) => assertWebhookUrl(url, true);

describe('assertWebhookUrl (private networks NOT allowed)', () => {
  it('accepts an https URL and returns it normalized', () => {
    expect(strict('  https://example.com/hook?x=1  ')).toBe(
      'https://example.com/hook?x=1'
    );
    expect(strict('https://example.com')).toBe('https://example.com/');
  });

  it('rejects http', () => {
    expect(() => strict('http://example.com/hook')).toThrow(
      'must start with https://'
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['not a string', 42],
    ['null', null],
    ['undefined', undefined]
  ])('rejects %s', (_label, value) => {
    expect(() => strict(value)).toThrow(WebhookValidationError);
  });

  it('rejects a string that is not a URL', () => {
    expect(() => strict('not a url')).toThrow('not a valid URL');
  });

  it.each([
    'ftp://example.com/x',
    'file:///etc/passwd',
    'javascript:alert(1)'
  ])('rejects the scheme in %s', (url) => {
    expect(() => strict(url)).toThrow(WebhookValidationError);
  });

  it('rejects credentials in the URL', () => {
    expect(() => strict('https://user:pass@example.com/')).toThrow(
      'username or password'
    );
  });

  it('rejects over-long URLs', () => {
    expect(() => strict(`https://example.com/${'a'.repeat(2100)}`)).toThrow(
      'at most 2048'
    );
  });

  it.each([
    'https://127.0.0.1/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://10.0.0.5/',
    'https://192.168.1.10:8443/',
    'https://[::1]/',
    'https://[::ffff:127.0.0.1]/',
    'https://localhost/hook',
    'https://app.localhost/hook',
    // The URL parser normalizes these to 127.0.0.1.
    'https://2130706433/',
    'https://0x7f.0.0.1/'
  ])('rejects the private address in %s', (url) => {
    expect(() => strict(url)).toThrow('private or reserved');
  });

  it('accepts a public IP literal', () => {
    expect(strict('https://8.8.8.8/hook')).toBe('https://8.8.8.8/hook');
  });
});

describe('assertWebhookUrl (private networks allowed)', () => {
  it('accepts http and private addresses', () => {
    expect(lenient('http://localhost:3000/hook')).toBe(
      'http://localhost:3000/hook'
    );
    expect(lenient('http://192.168.1.10/hook')).toBe(
      'http://192.168.1.10/hook'
    );
    expect(lenient('https://10.0.0.5/')).toBe('https://10.0.0.5/');
  });

  it('still rejects other schemes and credentials', () => {
    expect(() => lenient('ftp://example.com')).toThrow('http:// or https://');
    expect(() => lenient('http://a:b@localhost/')).toThrow(
      'username or password'
    );
  });
});
