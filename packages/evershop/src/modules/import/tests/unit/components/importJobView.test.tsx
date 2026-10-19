import '../../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import type { HttpReply, HttpRequest } from '../../../ui/importApi.js';
import { FakeTab, settle } from '../helpers/fakeTab.js';
import { aJob } from '../helpers/jobViews.js';
import { STORE_ZONE, browserTime, storeTime } from '../helpers/timeZones.js';

/**
 * The page of one import, whole: it reads the job, asks again while the job is
 * at work, survives a server that pushes back, and runs the buttons. The
 * browser is jsdom; the network, the clock of the tab and the confirm dialog
 * are replaced, so each case says exactly what the server answers and when.
 */
const tab = new FakeTab();
const sent: HttpRequest[] = [];
let answers: Array<(request: HttpRequest) => HttpReply | undefined> = [];
type Confirm = {
  primaryAction: { onAction(): void };
  secondaryAction: { onAction(): void };
};
const openAlert = jest.fn<(config: Confirm) => void>();
const closeAlert = jest.fn();
const success = jest.fn();
const goTo = jest.fn();

jest.unstable_mockModule('../../../ui/browserEnvironment.js', () => ({
  browserEnvironment: tab
}));
jest.unstable_mockModule('../../../ui/axiosHttp.js', () => ({
  axiosHttp: {
    send: async (request: HttpRequest): Promise<HttpReply> => {
      sent.push(request);
      for (let i = 0; i < answers.length; i += 1) {
        const reply = answers[i](request);
        if (reply) return reply;
      }
      throw new Error(`Nothing answers ${request.method} ${request.url}`);
    }
  }
}));
jest.unstable_mockModule('../../../ui/navigate.js', () => ({ goTo }));
jest.unstable_mockModule('@components/common/modal/Alert.js', () => ({
  useAlertContext: () => ({ openAlert, closeAlert })
}));
jest.unstable_mockModule('@components/common/ui/Sonner.js', () => ({
  toast: { success, error: jest.fn() }
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: ImportJobView } = await import(
  '../../../pages/admin/importView/ImportJobView.js'
);

const URLS = {
  jobUrl: '/api/import-jobs/j1',
  issuesUrl: '/api/import-jobs/j1/issues',
  startUrl: '/api/import-jobs/j1/start',
  cancelUrl: '/api/import-jobs/j1/cancel',
  resumeUrl: '/api/import-jobs/j1/resume',
  recheckUrl: '/api/import-jobs/j1/recheck',
  deleteUrl: '/api/import-jobs/j1',
  fileWithErrorsUrl: '/api/import-jobs/j1/file-with-errors.csv',
  openUrl: '/api/import-open-jobs',
  gridUrl: '/admin/import',
  newUrl: '/admin/import/new',
  setting: { storeTimeZone: STORE_ZONE }
};

const json = (data: unknown, status = 200, headers = {}): HttpReply => ({
  status,
  headers,
  data: status < 300 ? { data } : data
});
const refused = (
  status: number,
  code: string,
  message = 'Refused',
  headers = {}
) => json({ error: { status, code, message } }, status, headers);

/** The answers for one job that changes as the test says. */
function server(initial: ReturnType<typeof aJob>) {
  const state = {
    job: initial,
    open: [] as unknown[],
    get: 0,
    errors: [] as HttpReply[]
  };
  answers = [
    (r) =>
      r.method === 'GET' && r.url === URLS.jobUrl
        ? state.errors.shift() ?? json(state.job)
        : undefined,
    (r) =>
      r.method === 'GET' && r.url === URLS.openUrl
        ? json(state.open)
        : undefined,
    (r) =>
      r.method === 'GET' && r.url === URLS.issuesUrl
        ? json({
            phase: 'validate',
            page: 1,
            limit: 50,
            total: 0,
            byCode: {},
            truncated: false,
            items: []
          })
        : undefined
  ];
  return state;
}

/** Holds the answer to one request until the test lets it go. */
function hold(method: string, url: string) {
  let release: (reply: HttpReply) => void = () => undefined;
  const reply = new Promise<HttpReply>((resolve) => {
    release = resolve;
  });
  answers.unshift((r) =>
    r.method === method && r.url === url ? (reply as never) : undefined
  );
  return release;
}

let container: HTMLElement;
let root: ReturnType<typeof createRoot>;

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<ImportJobView {...URLS} />);
    await settle();
  });
}
const advance = (ms: number) =>
  act(async () => {
    await tab.advance(ms);
    await settle();
  });
const text = () => container.textContent?.replace(/\s+/g, ' ') ?? '';
const click = (action: string) =>
  act(async () => {
    (
      container.querySelector(`[data-action="${action}"]`) as HTMLElement
    ).click();
    await settle();
  });
const requests = (method: string, url: string) =>
  sent.filter((r) => r.method === method && r.url === url);

describe('the page of one import (jsdom)', () => {
  beforeEach(() => {
    sent.length = 0;
    tab.time = Date.parse('2026-10-19T09:01:00.000Z');
    tab.visible = true;
    openAlert.mockClear();
    closeAlert.mockClear();
    success.mockClear();
    goTo.mockClear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows the time of the upload in the time zone of the store, like the list', async () => {
    server(
      aJob({
        uuid: 'j1',
        status: 'validated',
        createdAt: '2026-10-19T09:00:00.000Z'
      })
    );
    await mount();
    expect(text()).toContain(storeTime);
    expect(text()).not.toContain(browserTime);
  });

  describe('a job at work', () => {
    const running = aJob({
      uuid: 'j1',
      status: 'running',
      stage: 'writing',
      startedAt: '2026-10-19T09:00:40.000Z',
      counts: { total: 1000, created: 100 }
    });

    it('reads the job when it opens, and again every five seconds, with the new numbers', async () => {
      const state = server(running);
      await mount();
      expect(text()).toContain('Importing... 100 of 1,000 rows');
      state.job = aJob({ ...running, counts: { total: 1000, created: 400 } });
      await advance(4999);
      expect(text()).toContain('100 of 1,000');
      await advance(1);
      expect(text()).toContain('Importing... 400 of 1,000 rows');
      expect(requests('GET', URLS.jobUrl)).toHaveLength(2);
    });

    it('stops asking when the job is over, and shows the result', async () => {
      const state = server(running);
      await mount();
      state.job = aJob({
        ...running,
        status: 'completed',
        counts: { total: 1000, created: 1000 }
      });
      await advance(5000);
      expect(text()).toContain('Done. Created 1,000');
      await advance(120_000);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(2);
    });

    it('does not ask while the tab is hidden, and asks as soon as it is shown', async () => {
      server(running);
      await mount();
      await act(async () => tab.setVisible(false));
      await advance(60_000);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(1);
      await act(async () => {
        tab.setVisible(true);
        await settle();
      });
      expect(requests('GET', URLS.jobUrl)).toHaveLength(2);
    });

    it('keeps what it knew when the server says 429, waits as long as Retry-After says, and goes on', async () => {
      const state = server(running);
      await mount();
      state.errors.push(
        refused(429, 'RATE_LIMITED', 'Too many requests', {
          'retry-after': '20'
        })
      );
      state.job = aJob({ ...running, counts: { total: 1000, created: 700 } });
      await advance(5000);
      expect(text()).toContain('100 of 1,000');
      expect(text()).toContain('shows the last state it knew');
      await advance(19_999);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(2);
      await advance(1);
      expect(text()).toContain('700 of 1,000');
      expect(text()).not.toContain('shows the last state it knew');
    });

    it('has Cancel, which asks first, then cancels with the header and shows the answer', async () => {
      const state = server(running);
      await mount();
      await click('cancel');
      expect(openAlert).toHaveBeenCalledTimes(1);
      expect(sent.filter((r) => r.method === 'POST')).toHaveLength(0);
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.cancelUrl
          ? json({
              ...aJob({ ...running, cancelRequested: true }),
              cancel: 'requested'
            })
          : undefined
      );
      state.job = aJob({ ...running, cancelRequested: true });
      await act(async () => {
        openAlert.mock.calls[0][0].secondaryAction.onAction();
        await settle();
      });
      const posts = requests('POST', URLS.cancelUrl);
      expect(posts).toHaveLength(1);
      expect(posts[0].headers).toEqual({ 'X-Import-Request': '1' });
      expect(closeAlert).toHaveBeenCalledTimes(1);
      expect(text()).toContain(
        'Canceling: the import stops after the row it is working on.'
      );
      expect(container.querySelector('[data-action="cancel"]')).toBeNull();
    });

    it('does nothing when the admin keeps the import', async () => {
      server(running);
      await mount();
      await click('cancel');
      await act(async () => {
        openAlert.mock.calls[0][0].primaryAction.onAction();
        await settle();
      });
      expect(closeAlert).toHaveBeenCalled();
      expect(sent.filter((r) => r.method === 'POST')).toHaveLength(0);
    });
  });

  describe('a checked file', () => {
    const valid = aJob({
      uuid: 'j1',
      status: 'validated',
      counts: { total: 10, createRows: 10 }
    });

    it('starts the import, and from then on follows it', async () => {
      const state = server(valid);
      await mount();
      expect(text()).toContain('All 10 rows are valid');
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.startUrl
          ? json(aJob({ ...valid, status: 'queued' }))
          : undefined
      );
      await click('start');
      const posts = requests('POST', URLS.startUrl);
      expect(posts).toHaveLength(1);
      expect(posts[0].headers).toEqual({ 'X-Import-Request': '1' });
      expect(text()).toContain('Starting...');
      state.job = aJob({
        ...valid,
        status: 'running',
        stage: 'writing',
        startedAt: '2026-10-19T09:02:00.000Z',
        counts: { total: 10, created: 5 }
      });
      const before = requests('GET', URLS.jobUrl).length;
      await advance(5000);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(before + 1);
      expect(text()).toContain('Importing... 5 of 10 rows');
    });

    it('shows why Start was refused, in words, and lets the admin try again', async () => {
      server(valid);
      await mount();
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.startUrl
          ? refused(
              409,
              'IMPORT_ALREADY_RUNNING',
              'A categories import is queued or running.'
            )
          : undefined
      );
      await click('start');
      expect(text()).toContain(
        'Another import is running. Only one import runs at a time.'
      );
      expect(
        (container.querySelector('[data-action="start"]') as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });

    it('holds Start back while another import runs, and frees it when that one ends', async () => {
      const state = server(valid);
      state.open = [
        aJob({ uuid: 'other', entity: 'category', status: 'running' })
      ];
      await mount();
      const start = () =>
        container.querySelector('[data-action="start"]') as HTMLButtonElement;
      expect(start().disabled).toBe(true);
      expect(text()).toContain(
        'A categories import is running. Start this one when it finishes.'
      );
      state.open = [];
      await advance(5000);
      expect(start().disabled).toBe(false);
      expect(text()).not.toContain('Start this one when it finishes');
      const asked = requests('GET', URLS.openUrl).length;
      await advance(60_000);
      expect(requests('GET', URLS.openUrl)).toHaveLength(asked);
    });

    it('checks again, with the header, and follows the check', async () => {
      server(valid);
      await mount();
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.recheckUrl
          ? json(aJob({ ...valid, status: 'uploaded' }))
          : undefined
      );
      await click('recheck');
      expect(requests('POST', URLS.recheckUrl)[0].headers).toEqual({
        'X-Import-Request': '1'
      });
      expect(text()).toContain('Waiting for the check to start...');
    });

    it('deletes after asking, with the header, and goes back to the list', async () => {
      server(valid);
      await mount();
      await click('delete');
      expect(openAlert).toHaveBeenCalledTimes(1);
      expect(requests('DELETE', URLS.deleteUrl)).toHaveLength(0);
      answers.unshift((r) =>
        r.method === 'DELETE' && r.url === URLS.deleteUrl
          ? json(valid)
          : undefined
      );
      await act(async () => {
        openAlert.mock.calls[0][0].secondaryAction.onAction();
        await settle();
      });
      expect(requests('DELETE', URLS.deleteUrl)[0].headers).toEqual({
        'X-Import-Request': '1'
      });
      expect(success).toHaveBeenCalledWith('The import was deleted.');
      expect(goTo).toHaveBeenCalledWith(URLS.gridUrl);
    });

    it('shows the refusal when the job moved on while the admin looked (WRONG_STATUS), and asks for the real state', async () => {
      const state = server(valid);
      await mount();
      state.job = aJob({ ...valid, status: 'queued' });
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.startUrl
          ? refused(409, 'WRONG_STATUS', 'Not now')
          : undefined
      );
      await click('start');
      expect(text()).toContain(
        'The import is not in a state where this can be done'
      );
      expect(text()).toContain('Starting...');
    });
  });

  describe('a checked file, more', () => {
    const valid = aJob({
      uuid: 'j1',
      status: 'validated',
      counts: { total: 10, createRows: 10 }
    });

    it('holds every button while a request is on its way, and frees them when it is answered', async () => {
      server(valid);
      await mount();
      const release = hold('POST', URLS.recheckUrl);
      await act(async () => {
        (
          container.querySelector('[data-action="recheck"]') as HTMLElement
        ).click();
        await settle();
      });
      const disabled = () =>
        [...container.querySelectorAll('[data-action]')].map(
          (b) => (b as HTMLButtonElement).disabled
        );
      expect(disabled()).toEqual([true, true, true]);
      await act(async () => {
        release(json(aJob({ ...valid, status: 'uploaded' })));
        await settle();
      });
      expect(text()).toContain('Waiting for the check to start...');
    });

    it('forgets an earlier refusal when the admin tries again', async () => {
      server(valid);
      await mount();
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.startUrl
          ? refused(409, 'FILE_HAS_ERRORS')
          : undefined
      );
      await click('start');
      expect(text()).toContain('The file still has errors.');
      answers.shift();
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.startUrl
          ? json(aJob({ ...valid, status: 'queued' }))
          : undefined
      );
      await click('start');
      expect(text()).not.toContain('The file still has errors.');
    });
  });

  describe('a stopped import', () => {
    const stopped = aJob({
      uuid: 'j1',
      status: 'stopped',
      startedAt: '2026-10-19T09:00:40.000Z',
      counts: { total: 100, created: 40, failed: 10 }
    });

    it('can be resumed, with the header, and then it is followed', async () => {
      server(stopped);
      await mount();
      answers.unshift((r) =>
        r.method === 'POST' && r.url === URLS.resumeUrl
          ? json(aJob({ ...stopped, status: 'queued' }))
          : undefined
      );
      await click('resume');
      expect(requests('POST', URLS.resumeUrl)[0].headers).toEqual({
        'X-Import-Request': '1'
      });
      expect(text()).toContain('Resuming...');
    });

    it('cannot be resumed while another import runs', async () => {
      const state = server(stopped);
      state.open = [
        aJob({ uuid: 'other', entity: 'category', status: 'running' })
      ];
      await mount();
      const resume = container.querySelector(
        '[data-action="resume"]'
      ) as HTMLButtonElement;
      expect(resume.disabled).toBe(true);
      expect(text()).toContain('A categories import is running.');
    });

    it('cannot be resumed while another import of its type is still open', async () => {
      const state = server(stopped);
      state.open = [
        aJob({ uuid: 'other', entity: 'product', status: 'validated' })
      ];
      await mount();
      // An open job alone does not make the page keep asking.
      await advance(30_000);
      const resume = container.querySelector(
        '[data-action="resume"]'
      ) as HTMLButtonElement;
      expect(resume.disabled).toBe(true);
      expect(text()).toContain(
        'There is another products import that is not finished.'
      );
      expect(requests('GET', URLS.openUrl)).toHaveLength(1);
    });
  });

  it('warns that a queued import has not started after two minutes, by the clock of the page', async () => {
    server(
      aJob({
        uuid: 'j1',
        status: 'queued',
        statusChangedAt: '2026-10-19T09:00:30.000Z'
      })
    );
    await mount();
    expect(text()).not.toContain('has not started yet');
    // The job is still queued; the clock moves on and the page asks again.
    await advance(5000);
    expect(text()).not.toContain('has not started yet');
    await advance(115_000);
    expect(text()).toContain('The import has not started yet.');
  });

  describe('a job that disappears or a session that ends while the page is open', () => {
    const running = aJob({
      uuid: 'j1',
      status: 'running',
      stage: 'writing',
      startedAt: '2026-10-19T09:00:40.000Z',
      counts: { total: 100, created: 10 }
    });

    it('shows only that the import no longer exists when another admin deleted it', async () => {
      const state = server(running);
      await mount();
      state.errors.push(refused(404, 'NOT_FOUND'));
      await advance(5000);
      expect(text()).toContain('This import no longer exists.');
      expect(text()).not.toContain('products.csv');
      await advance(60_000);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(2);
    });

    it('keeps the job on the screen, with the reason, when the session ended (403)', async () => {
      const state = server(running);
      await mount();
      state.errors.push(refused(403, 'FORBIDDEN', 'Forbidden'));
      await advance(5000);
      expect(text()).toContain('products.csv');
      expect(text()).toContain('Forbidden');
      await advance(60_000);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(2);
    });
  });

  describe('a job that is gone', () => {
    it('says so and stops asking', async () => {
      server(aJob({ uuid: 'j1' }));
      answers.unshift((r) =>
        r.url === URLS.jobUrl ? refused(404, 'NOT_FOUND') : undefined
      );
      await mount();
      expect(text()).toContain('This import no longer exists.');
      await advance(60_000);
      expect(requests('GET', URLS.jobUrl)).toHaveLength(1);
    });
  });

  describe('a job with no problems to show', () => {
    it.each([
      [
        'a clean checked file',
        { status: 'validated' as const, counts: { total: 10 } }
      ],
      [
        'a running import',
        {
          status: 'running' as const,
          stage: 'writing' as const,
          counts: { total: 10 }
        }
      ],
      [
        'a completed import with no failed row',
        {
          status: 'completed' as const,
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { total: 10, created: 10 }
        }
      ]
    ])('asks for no problems and shows no table: %s', async (_name, fields) => {
      server(aJob({ uuid: 'j1', ...fields }));
      await mount();
      expect(requests('GET', URLS.issuesUrl)).toHaveLength(0);
      expect(text()).not.toContain('Problems');
    });
  });

  describe('a job with problems', () => {
    it('shows the table of problems, with the totals per type from the server', async () => {
      const state = server(
        aJob({
          uuid: 'j1',
          status: 'validated',
          counts: { errors: 2, total: 10 }
        })
      );
      answers.unshift((r) =>
        r.method === 'GET' && r.url === URLS.issuesUrl
          ? json({
              phase: 'validate',
              page: 1,
              limit: 50,
              total: 2,
              byCode: { INVALID_VALUE: 2 },
              truncated: false,
              items: [
                {
                  row: 14,
                  key: 'TSH-1',
                  column: 'price',
                  code: 'INVALID_VALUE',
                  severity: 'error',
                  params: {},
                  message: 'Price must be a number.',
                  value: '24.9.9'
                },
                {
                  row: 20,
                  key: 'TSH-2',
                  column: 'price',
                  code: 'INVALID_VALUE',
                  severity: 'error',
                  params: {},
                  message: 'Price must be a number.',
                  value: 'x'
                }
              ]
            })
          : undefined
      );
      expect(state.job.status).toBe('validated');
      await mount();
      const t = text();
      expect(t).toContain('Problems by type:');
      expect(t).toContain('INVALID_VALUE x2');
      expect(t).toContain('TSH-1');
      expect(t).toContain('Price must be a number.');
      expect(sent.find((r) => r.url === URLS.issuesUrl)?.params).toEqual({
        page: 1,
        limit: 50
      });
    });
  });
});
