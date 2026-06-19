import http from 'http';
import { assertAllowedUrl, secureFetch } from '../../secureFetch.js';

describe('secureFetch image-host allowlist', () => {
  const ORIGINAL = process.env.IMAGE_ALLOWED_HOSTS;
  afterAll(() => {
    if (ORIGINAL === undefined) {
      delete process.env.IMAGE_ALLOWED_HOSTS;
    } else {
      process.env.IMAGE_ALLOWED_HOSTS = ORIGINAL;
    }
  });

  describe('assertAllowedUrl', () => {
    beforeEach(() => {
      process.env.IMAGE_ALLOWED_HOSTS = 'cdn.example.com, 127.0.0.1';
    });

    it('rejects non-http(s) schemes', () => {
      expect(() => assertAllowedUrl('ftp://cdn.example.com/x')).toThrow();
      expect(() => assertAllowedUrl('file:///etc/passwd')).toThrow();
    });

    it('rejects any host not on the allowlist (public or private)', () => {
      expect(() => assertAllowedUrl('http://evil.com/x')).toThrow(/not allowed/);
      expect(() =>
        assertAllowedUrl('http://169.254.169.254/latest/meta-data/')
      ).toThrow(/not allowed/);
      expect(() => assertAllowedUrl('http://10.0.0.5/')).toThrow(/not allowed/);
    });

    it('allows hosts on the allowlist', () => {
      expect(assertAllowedUrl('https://cdn.example.com/a.jpg').hostname).toBe(
        'cdn.example.com'
      );
      expect(assertAllowedUrl('http://127.0.0.1:9000/a.jpg').hostname).toBe(
        '127.0.0.1'
      );
    });

    it('rejects everything when the allowlist is empty', () => {
      process.env.IMAGE_ALLOWED_HOSTS = '';
      expect(() => assertAllowedUrl('https://cdn.example.com/a.jpg')).toThrow(
        /not allowed/
      );
    });
  });

  describe('secureFetch', () => {
    let server;
    let port;

    beforeAll(async () => {
      server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      port = server.address().port;
    });

    afterAll(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    it('fetches from a host on the allowlist', async () => {
      process.env.IMAGE_ALLOWED_HOSTS = '127.0.0.1';
      const res = await secureFetch(`http://127.0.0.1:${port}/`);
      expect(res.status).toBe(200);
    });

    it('refuses a host that is not on the allowlist', async () => {
      process.env.IMAGE_ALLOWED_HOSTS = 'cdn.example.com';
      await expect(
        secureFetch(`http://127.0.0.1:${port}/`)
      ).rejects.toThrow();
    });
  });
});
