import { describe, expect, it } from '@jest/globals';
import {
  IMPORT_REQUEST_HEADER,
  createImportApi,
  parseRetryAfter
} from '../../../ui/importApi.js';
import type { Http, HttpReply, HttpRequest } from '../../../ui/importApi.js';

/** An `Http` that answers with what the test says and remembers what it was asked. */
function fakeHttp(answer: HttpReply | Error) {
  const seen: HttpRequest[] = [];
  const http: Http = {
    async send(request) {
      seen.push(request);
      if (answer instanceof Error) throw answer;
      return answer;
    }
  };
  return { http, seen };
}

const ok = (data: unknown): HttpReply => ({
  status: 200,
  headers: {},
  data: { data }
});

describe('Retry-After', () => {
  const now = Date.parse('2026-10-19T10:00:00Z');

  it.each([
    ['5', 5000],
    [' 30 ', 30_000],
    ['0', 0]
  ])('reads %p seconds', (text, ms) => {
    expect(parseRetryAfter(text, now)).toBe(ms);
  });

  it('reads a date as the time left until it', () => {
    expect(parseRetryAfter('Mon, 19 Oct 2026 10:00:12 GMT', now)).toBe(12_000);
  });

  it('takes a date in the past as no wait', () => {
    expect(parseRetryAfter('Mon, 19 Oct 2026 09:00:00 GMT', now)).toBe(0);
  });

  it.each([undefined, '', 'soon', '-3', '1.5'])('gives nothing for %p', (v) => {
    expect(parseRetryAfter(v, now)).toBeNull();
  });
});

describe('the import API client', () => {
  it('gives the data of a good answer', async () => {
    const { http } = fakeHttp(ok({ uuid: 'u1' }));
    const result = await createImportApi(http, () => 0).getJob('/api/x');
    expect(result).toEqual({ ok: true, data: { uuid: 'u1' } });
  });

  it('reads the code, the message and the details of a refusal', async () => {
    const { http } = fakeHttp({
      status: 409,
      headers: {},
      data: {
        error: {
          status: 409,
          code: 'IMPORT_ALREADY_RUNNING',
          message: 'A categories import is queued or running.',
          details: { entity: 'category' }
        }
      }
    });
    const result = await createImportApi(http, () => 0).start('/api/x/start');
    expect(result).toEqual({
      ok: false,
      error: {
        status: 409,
        code: 'IMPORT_ALREADY_RUNNING',
        message: 'A categories import is queued or running.',
        details: { entity: 'category' },
        retryAfterMs: null,
        aborted: false
      }
    });
  });

  it('copes with an answer that is not core’s error shape (a proxy page)', async () => {
    const { http } = fakeHttp({
      status: 502,
      headers: {},
      data: '<html>Bad gateway</html>'
    });
    const result = await createImportApi(http, () => 0).getJob('/api/x');
    expect(result).toMatchObject({
      ok: false,
      error: { status: 502, code: null, message: 'The request failed (502).' }
    });
  });

  it('reads Retry-After from a 429, whatever the case of the header name', async () => {
    const { http } = fakeHttp({
      status: 429,
      headers: { 'Retry-After': '12' },
      data: { error: { status: 429, message: 'Too many requests' } }
    });
    const result = await createImportApi(http, () => 0).getJob('/api/x');
    expect(result).toMatchObject({
      ok: false,
      error: { status: 429, retryAfterMs: 12_000 }
    });
  });

  it('turns a request that got no answer into status 0', async () => {
    const { http } = fakeHttp(new Error('Network Error'));
    const result = await createImportApi(http, () => 0).getJob('/api/x');
    expect(result).toEqual({
      ok: false,
      error: {
        status: 0,
        code: null,
        message: 'Network Error',
        details: {},
        retryAfterMs: null,
        aborted: false
      }
    });
  });

  it('says so when the page itself aborted the request', async () => {
    const controller = new AbortController();
    controller.abort();
    const { http } = fakeHttp(new Error('canceled'));
    const result = await createImportApi(http, () => 0).getJob(
      '/api/x',
      controller.signal
    );
    expect(result).toMatchObject({ ok: false, error: { aborted: true } });
  });

  it.each([
    ['start', 'POST'],
    ['cancel', 'POST'],
    ['resume', 'POST'],
    ['recheck', 'POST'],
    ['remove', 'DELETE']
  ] as Array<['start' | 'cancel' | 'resume' | 'recheck' | 'remove', string]>)(
    '%s sends %s with the header that a form on another site cannot send',
    async (call, method) => {
      const { http, seen } = fakeHttp(ok({}));
      await createImportApi(http, () => 0)[call]('/api/x/y');
      expect(seen).toEqual([
        {
          method,
          url: '/api/x/y',
          headers: { [IMPORT_REQUEST_HEADER]: '1' }
        }
      ]);
    }
  );

  it('does not send the header on a read', async () => {
    const { http, seen } = fakeHttp(ok([]));
    const api = createImportApi(http, () => 0);
    await api.getJob('/api/a');
    await api.listOpen('/api/b');
    await api.issues('/api/c', {});
    expect(seen.map((r) => r.headers)).toEqual([
      undefined,
      undefined,
      undefined
    ]);
    expect(seen.map((r) => r.method)).toEqual(['GET', 'GET', 'GET']);
  });

  it('leaves out the filters of the problems that are empty', async () => {
    const { http, seen } = fakeHttp(ok({ items: [] }));
    await createImportApi(http, () => 0).issues('/api/c', {
      severity: undefined,
      code: '',
      column: 'price',
      page: 2,
      limit: 50
    });
    expect(seen[0].params).toEqual({ column: 'price', page: 2, limit: 50 });
  });

  describe('the upload', () => {
    const file = Object.assign(
      new Blob(['sku,name\nA,B\n'], { type: 'text/csv' }),
      {
        name: 'products.csv'
      }
    );

    it('sends the fields before the file, because the server reads them while the file streams in', async () => {
      const { http, seen } = fakeHttp(ok({ uuid: 'u1', replaced: false }));
      await createImportApi(http, () => 0).upload('/api/import-jobs', {
        entity: 'product',
        mode: 'create',
        checkImages: true,
        file
      });
      const body = seen[0].body!;
      expect([...body.keys()]).toEqual([
        'entity',
        'mode',
        'checkImages',
        'file'
      ]);
      expect(body.get('entity')).toBe('product');
      expect(body.get('mode')).toBe('create');
      expect(body.get('checkImages')).toBe('true');
      expect((body.get('file') as File).name).toBe('products.csv');
    });

    it('says false for a box that is not ticked', async () => {
      const { http, seen } = fakeHttp(ok({ uuid: 'u1' }));
      await createImportApi(http, () => 0).upload('/api/import-jobs', {
        entity: 'category',
        mode: 'upsert',
        checkImages: false,
        file
      });
      expect(seen[0].body!.get('checkImages')).toBe('false');
    });

    it('is a POST with the header that a form on another site cannot send', async () => {
      const { http, seen } = fakeHttp(ok({ uuid: 'u1' }));
      await createImportApi(http, () => 0).upload('/api/import-jobs', {
        entity: 'product',
        mode: 'upsert',
        checkImages: false,
        file
      });
      expect(seen[0]).toMatchObject({
        method: 'POST',
        url: '/api/import-jobs',
        headers: { [IMPORT_REQUEST_HEADER]: '1' }
      });
    });

    it('hands the progress and the signal to the network', async () => {
      const { http, seen } = fakeHttp(ok({ uuid: 'u1' }));
      const progress = () => undefined;
      const controller = new AbortController();
      await createImportApi(http, () => 0).upload(
        '/api/import-jobs',
        { entity: 'product', mode: 'upsert', checkImages: false, file },
        progress,
        controller.signal
      );
      expect(seen[0].onUploadProgress).toBe(progress);
      expect(seen[0].signal).toBe(controller.signal);
    });

    it('gives the job and whether it replaced another', async () => {
      const { http } = fakeHttp(
        ok({ uuid: 'u1', status: 'uploaded', replaced: true })
      );
      const api = createImportApi(http, () => 0);
      const result = await api.upload('/api/import-jobs', {
        entity: 'product',
        mode: 'upsert',
        checkImages: false,
        file
      });
      expect(result).toEqual({
        ok: true,
        data: { job: { uuid: 'u1', status: 'uploaded' }, replaced: true }
      });
    });

    it('says not replaced when the answer does not say so', async () => {
      const { http } = fakeHttp(ok({ uuid: 'u1' }));
      const result = await createImportApi(http, () => 0).upload(
        '/api/import-jobs',
        {
          entity: 'product',
          mode: 'upsert',
          checkImages: false,
          file
        }
      );
      expect(result).toMatchObject({ ok: true, data: { replaced: false } });
    });

    it('reads the refusal of a file that is too large, with the limit', async () => {
      const { http } = fakeHttp({
        status: 413,
        headers: {},
        data: {
          error: {
            status: 413,
            code: 'FILE_TOO_LARGE',
            message: 'The file is larger than 100 MB.',
            details: { maxFileBytes: 104857600 }
          }
        }
      });
      const result = await createImportApi(http, () => 0).upload(
        '/api/import-jobs',
        {
          entity: 'product',
          mode: 'upsert',
          checkImages: false,
          file
        }
      );
      expect(result).toMatchObject({
        ok: false,
        error: {
          status: 413,
          code: 'FILE_TOO_LARGE',
          details: { maxFileBytes: 104857600 }
        }
      });
    });
  });
});
