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
 * The page "New import", whole: it looks at the jobs of the chosen type, asks
 * before an upload closes or replaces something (D-32), sends the file with a
 * bar and goes to the page of the new job. The browser is jsdom; the network, the
 * clock of the tab, the dialog and the navigation are replaced.
 */
const tab = new FakeTab();
const sent: HttpRequest[] = [];
let answers: Array<
  (request: HttpRequest) => HttpReply | Promise<HttpReply> | undefined
> = [];
type Confirm = {
  heading: string;
  content: string;
  primaryAction: { onAction(): void };
  secondaryAction: { onAction(): void };
};
const openAlert = jest.fn<(config: Confirm) => void>();
const closeAlert = jest.fn();
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

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: ImportNewForm } = await import(
  '../../../pages/admin/importNew/ImportNewForm.js'
);

const PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const PROPS = {
  createUrl: '/api/import-jobs',
  openUrl: '/api/import-open-jobs',
  viewUrl: `/admin/import/${PLACEHOLDER}`,
  templateProductUrl: '/api/import-templates/products',
  templateCategoryUrl: '/api/import-templates/categories',
  templateCustomerUrl: '/api/import-templates/customers',
  templateCustomerAddressUrl: '/api/import-templates/customer-addresses',
  currentAdminUser: { adminUserId: 1 },
  importLimits: { maxFileBytes: 100 * 1_048_576 },
  setting: { storeTimeZone: STORE_ZONE }
};

const json = (data: unknown, status = 200): HttpReply => ({
  status,
  headers: {},
  data: status < 300 ? { data } : data
});
const refused = (
  status: number,
  code: string,
  message = 'Refused',
  details = {}
) => json({ error: { status, code, message, details } }, status);

/** The server: the jobs it lists, and what an upload answers. */
function server(open: unknown[] = []) {
  const state = {
    open,
    upload: (_r: HttpRequest): HttpReply | Promise<HttpReply> =>
      json({
        ...aJob({ uuid: 'new-job', status: 'uploaded' }),
        replaced: false
      })
  };
  answers = [
    (r) =>
      r.method === 'GET' && r.url === PROPS.openUrl
        ? json(state.open)
        : undefined,
    (r) =>
      r.method === 'POST' && r.url === PROPS.createUrl
        ? state.upload(r)
        : undefined
  ];
  return state;
}

let container: HTMLElement;
let root: ReturnType<typeof createRoot>;
const mount = async (props = PROPS) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<ImportNewForm {...props} />);
    await settle();
  });
};
const advance = (ms: number) =>
  act(async () => {
    await tab.advance(ms);
    await settle();
  });
const text = () => container.textContent?.replace(/\s+/g, ' ') ?? '';
const uploads = () => sent.filter((r) => r.method === 'POST');
const listings = () => sent.filter((r) => r.method === 'GET');
const radio = (value: string) =>
  container.querySelector(
    `input[type="radio"][value="${value}"]`
  ) as HTMLInputElement;
const button = (label: string) =>
  [...container.querySelectorAll('button')].find(
    (b) => b.textContent === label
  ) as HTMLButtonElement | undefined;

async function pick(entity: string) {
  await act(async () => {
    radio(entity).click();
    await settle();
  });
}
async function chooseFile(name = 'products.csv', size?: number) {
  const file = new File(['sku,name\nA,B\n'], name, { type: 'text/csv' });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  const input = container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
  });
  return file;
}
const submit = () =>
  act(async () => {
    button('Upload and validate')!.click();
    await settle();
  });
const confirmWith = (n: number, which: 'primaryAction' | 'secondaryAction') =>
  act(async () => {
    openAlert.mock.calls[n][0][which].onAction();
    await settle();
  });

describe('the page New import (jsdom)', () => {
  beforeEach(() => {
    sent.length = 0;
    tab.time = Date.parse('2026-10-19T09:01:00.000Z');
    tab.visible = true;
    openAlert.mockClear();
    closeAlert.mockClear();
    goTo.mockClear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  describe('the choices', () => {
    it('starts with products, a file to choose, and the button held', async () => {
      server();
      await mount();
      expect(radio('product').checked).toBe(true);
      expect(text()).toContain('No file chosen');
      expect(button('Upload and validate')!.disabled).toBe(true);
    });

    it('links the template of the chosen type', async () => {
      server();
      await mount();
      const link = () =>
        container.querySelector('a[download]') as HTMLAnchorElement;
      expect(link().getAttribute('href')).toBe(
        '/api/import-templates/products'
      );
      await pick('category');
      expect(link().getAttribute('href')).toBe(
        '/api/import-templates/categories'
      );
      await pick('customer');
      expect(link().getAttribute('href')).toBe(
        '/api/import-templates/customers'
      );
      await pick('customerAddress');
      expect(link().getAttribute('href')).toBe(
        '/api/import-templates/customer-addresses'
      );
    });

    it('shows the mode and the image check only where they apply', async () => {
      server();
      await mount();
      expect(text()).toContain('If a record already exists');
      expect(text()).toContain('Check that image URLs');
      await pick('customer');
      expect(text()).toContain('If a record already exists');
      expect(text()).not.toContain('Check that image URLs');
      await pick('customerAddress');
      expect(text()).not.toContain('If a record already exists');
    });

    it('frees the button when a file is chosen, and shows its name', async () => {
      server();
      await mount();
      await chooseFile('my products.csv');
      expect(text()).toContain('my products.csv');
      expect(button('Upload and validate')!.disabled).toBe(false);
    });

    it('refuses a file that is empty or too large before sending it', async () => {
      server();
      await mount();
      await chooseFile('empty.csv', 0);
      expect(text()).toContain('The file is empty.');
      expect(button('Upload and validate')!.disabled).toBe(true);
      await chooseFile('huge.csv', 101 * 1_048_576);
      expect(text()).toContain('The file is larger than 100 MB.');
      expect(button('Upload and validate')!.disabled).toBe(true);
      await chooseFile('fine.csv');
      expect(button('Upload and validate')!.disabled).toBe(false);
    });

    it('leaves the size to the server when the limit is not known', async () => {
      server();
      await mount({ ...PROPS, importLimits: null as never });
      await chooseFile('huge.csv', 10 ** 12);
      expect(button('Upload and validate')!.disabled).toBe(false);
    });
  });

  describe('the upload', () => {
    it('sends the fields before the file, with the header, shows the bar, and goes to the page of the new job', async () => {
      const state = server();
      let report: (sent: number, total: number) => void = () => undefined;
      let finish: (r: HttpReply) => void = () => undefined;
      state.upload = (r) => {
        report = r.onUploadProgress!;
        return new Promise<HttpReply>((resolve) => {
          finish = resolve;
        });
      };
      await mount();
      await pick('category');
      await chooseFile('categories.csv');
      await submit();
      const post = uploads()[0];
      expect([...post.body!.keys()]).toEqual([
        'entity',
        'mode',
        'checkImages',
        'file'
      ]);
      expect(post.body!.get('entity')).toBe('category');
      expect(post.body!.get('mode')).toBe('upsert');
      expect(post.body!.get('checkImages')).toBe('false');
      expect((post.body!.get('file') as File).name).toBe('categories.csv');
      expect(post.headers).toEqual({ 'X-Import-Request': '1' });
      // the bar follows the bytes
      await act(async () => report(25, 100));
      expect(text()).toContain('25%');
      expect(text()).toContain(
        'The page must stay open until the upload ends.'
      );
      await act(async () => report(100, 100));
      expect(text()).toContain('Finishing the upload...');
      expect(goTo).not.toHaveBeenCalled();
      await act(async () => {
        finish(
          json({
            ...aJob({ uuid: 'abc-123', status: 'uploaded' }),
            replaced: false
          })
        );
        await settle();
      });
      expect(goTo).toHaveBeenCalledWith('/admin/import/abc-123');
    });

    it('rounds the bar down, so it never says 100 % before the whole file is sent, and has no NaN when the size is not known', async () => {
      const state = server();
      let report: (sent: number, total: number) => void = () => undefined;
      state.upload = (r) => {
        report = r.onUploadProgress!;
        return new Promise<HttpReply>(() => undefined);
      };
      await mount();
      await chooseFile();
      await submit();
      await act(async () => report(0, 0));
      expect(text()).toContain('0%');
      expect(text()).not.toContain('NaN');
      await act(async () => report(997, 1000));
      expect(text()).toContain('99%');
      expect(text()).toContain(
        'The page must stay open until the upload ends.'
      );
    });

    it('does not ask the admin to stay when the page itself goes to the page of the new job', async () => {
      const state = server();
      // The answer comes after the page has shown the bar and set its warning, as it does
      // when a real file takes time to send.
      let finish: (r: HttpReply) => void = () => undefined;
      state.upload = () =>
        new Promise<HttpReply>((resolve) => {
          finish = resolve;
        });
      // The navigation is where the browser would ask; the test asks it the same way.
      let asked: boolean | null = null;
      goTo.mockImplementationOnce(() => {
        const event = new window.Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        asked = event.defaultPrevented;
      });
      await mount();
      await chooseFile();
      await submit();
      const during = new window.Event('beforeunload', { cancelable: true });
      window.dispatchEvent(during);
      expect(during.defaultPrevented).toBe(true);
      await act(async () => {
        finish(
          json({
            ...aJob({ uuid: 'abc-123', status: 'uploaded' }),
            replaced: false
          })
        );
        await settle();
      });
      expect(goTo).toHaveBeenCalledTimes(1);
      expect(asked).toBe(false);
    });

    it('sends the mode that was chosen, and the image check when it is ticked', async () => {
      server();
      await mount();
      const select = container.querySelector('select') as HTMLSelectElement;
      await act(async () => {
        select.value = 'create';
        select.dispatchEvent(new window.Event('change', { bubbles: true }));
        await settle();
      });
      await act(async () => {
        (
          container.querySelector('input[type="checkbox"]') as HTMLInputElement
        ).click();
        await settle();
      });
      await chooseFile();
      await submit();
      expect(uploads()[0].body!.get('mode')).toBe('create');
      expect(uploads()[0].body!.get('checkImages')).toBe('true');
    });

    it('does not send the image check for a type that has no images, even if it was ticked for another', async () => {
      server();
      await mount();
      await act(async () => {
        (
          container.querySelector('input[type="checkbox"]') as HTMLInputElement
        ).click();
        await settle();
      });
      await pick('customer');
      await chooseFile('customers.csv');
      await submit();
      expect(uploads()[0].body!.get('checkImages')).toBe('false');
    });

    it('sends customer addresses with the default mode: they are only added', async () => {
      server();
      await mount();
      const select = container.querySelector('select') as HTMLSelectElement;
      await act(async () => {
        select.value = 'update';
        select.dispatchEvent(new window.Event('change', { bubbles: true }));
        await settle();
      });
      await pick('customerAddress');
      await chooseFile('addresses.csv');
      await submit();
      expect(uploads()[0].body!.get('entity')).toBe('customerAddress');
      expect(uploads()[0].body!.get('mode')).toBe('upsert');
    });

    it('holds the choices and the button while the file is on its way', async () => {
      const state = server();
      state.upload = () => new Promise<HttpReply>(() => undefined);
      await mount();
      await chooseFile();
      await submit();
      expect(button('Upload and validate')).toBeUndefined();
      expect(radio('product').closest('fieldset')!.disabled).toBe(true);
      expect(
        (container.querySelector('input[type="file"]') as HTMLInputElement)
          .disabled
      ).toBe(true);
    });

    it('warns before the tab is closed while the file is on its way, and not otherwise', async () => {
      const state = server();
      let finish: (r: HttpReply) => void = () => undefined;
      state.upload = () =>
        new Promise<HttpReply>((resolve) => {
          finish = resolve;
        });
      await mount();
      const closeTab = () => {
        const event = new window.Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };
      expect(closeTab()).toBe(false);
      await chooseFile();
      await submit();
      expect(closeTab()).toBe(true);
      await act(async () => {
        finish(refused(500, 'X'));
        await settle();
      });
      expect(closeTab()).toBe(false);
    });

    it('stops the upload when the admin cancels it, and says nothing about an error', async () => {
      const state = server();
      state.upload = (r) =>
        new Promise<HttpReply>((_resolve, reject) => {
          r.signal!.addEventListener('abort', () =>
            reject(new Error('canceled'))
          );
        });
      await mount();
      await chooseFile();
      await submit();
      await act(async () => {
        button('Cancel the upload')!.click();
        await settle();
      });
      expect(uploads()[0].signal!.aborted).toBe(true);
      expect(text()).not.toContain('did not finish');
      expect(button('Upload and validate')!.disabled).toBe(false);
      expect(goTo).not.toHaveBeenCalled();
    });

    it('stops the upload when the admin leaves the page', async () => {
      const state = server();
      state.upload = () => new Promise<HttpReply>(() => undefined);
      await mount();
      await chooseFile();
      await submit();
      await act(async () => root.unmount());
      expect(uploads()[0].signal!.aborted).toBe(true);
      root = createRoot(container);
    });

    describe('when it fails', () => {
      it.each([
        [
          'an import of the type that began meanwhile',
          refused(409, 'IMPORT_RUNNING'),
          'An import of this type is running.'
        ],
        [
          'a file the server finds too large',
          refused(413, 'FILE_TOO_LARGE', 'x', { maxFileBytes: 5 * 1_048_576 }),
          'The file is larger than 5 MB.'
        ],
        [
          'a request the server does not accept',
          refused(400, 'INVALID_REQUEST', 'The field "entity" is missing.'),
          'The field "entity" is missing.'
        ],
        [
          'a connection that dropped',
          { status: 0 } as HttpReply,
          'The upload did not finish. Check your connection and try again.'
        ]
      ])(
        'shows the reason, keeps the file, and lets the admin try again: %s',
        async (_name, reply, message) => {
          const state = server();
          state.upload = () => {
            if (reply.status === 0) throw new Error('Network Error');
            return reply;
          };
          await mount();
          await chooseFile();
          await submit();
          expect(text()).toContain(message);
          expect(goTo).not.toHaveBeenCalled();
          expect(text()).toContain('products.csv');
          expect(button('Upload and validate')!.disabled).toBe(false);
        }
      );

      it('forgets the message when another file is chosen', async () => {
        const state = server();
        state.upload = () => refused(409, 'IMPORT_RUNNING');
        await mount();
        await chooseFile();
        await submit();
        expect(text()).toContain('An import of this type is running.');
        await chooseFile('other.csv');
        expect(text()).not.toContain('An import of this type is running.');
      });

      it('forgets the message at the next try, even if the try stops before sending', async () => {
        const state = server();
        state.upload = () => refused(409, 'IMPORT_RUNNING');
        await mount();
        await chooseFile();
        await submit();
        expect(text()).toContain('An import of this type is running.');
        // This time the import is seen at work, so nothing is sent.
        state.open = [
          aJob({
            uuid: 'b',
            status: 'running',
            stage: 'writing',
            startedAt: '2026-10-19T09:00:40.000Z',
            counts: { total: 10 }
          })
        ];
        await submit();
        expect(text()).not.toContain(
          'An import of this type is running. Upload'
        );
        expect(text()).toContain('A products import is running');
      });

      it('forgets the message when something is chosen again', async () => {
        const state = server();
        state.upload = () => refused(409, 'IMPORT_RUNNING');
        await mount();
        await chooseFile();
        await submit();
        expect(text()).toContain('An import of this type is running.');
        await pick('customer');
        expect(text()).not.toContain('An import of this type is running.');
      });
    });
  });

  describe('an import of the type is at work', () => {
    const running = (over = {}) =>
      aJob({
        uuid: 'busy-1',
        entity: 'product',
        status: 'running',
        stage: 'writing',
        startedAt: '2026-10-19T09:00:40.000Z',
        counts: { total: 100, created: 36 },
        ...over
      });

    it('says so, with how far it is, and holds the button', async () => {
      server([running()]);
      await mount();
      await chooseFile();
      expect(text()).toContain('A products import is running (36%).');
      expect(button('Upload and validate')!.disabled).toBe(true);
      expect(
        container.querySelector('a[href="/admin/import/busy-1"]')
      ).not.toBeNull();
    });

    it('keeps looking while it runs, shows its progress, and frees the button when it ends', async () => {
      const state = server([running()]);
      await mount();
      await chooseFile();
      state.open = [running({ counts: { total: 100, created: 80 } })];
      await advance(5000);
      expect(text()).toContain('(80%)');
      state.open = [];
      await advance(5000);
      expect(text()).not.toContain('import is running');
      expect(button('Upload and validate')!.disabled).toBe(false);
      const asked = listings().length;
      await advance(60_000);
      expect(listings()).toHaveLength(asked);
    });

    it('is no obstacle for another type', async () => {
      server([running()]);
      await mount();
      await pick('category');
      await chooseFile('categories.csv');
      expect(text()).not.toContain('import is running');
      expect(button('Upload and validate')!.disabled).toBe(false);
      expect(listings().length).toBeGreaterThanOrEqual(2);
      // Nothing of this type is at work, so the page does not keep looking.
      const asked = listings().length;
      await advance(60_000);
      expect(listings()).toHaveLength(asked);
    });

    it('does not send the file when the import began between the page and the click', async () => {
      const state = server();
      await mount();
      await chooseFile();
      state.open = [running()];
      await submit();
      expect(uploads()).toHaveLength(0);
      expect(text()).toContain('A products import is running (36%).');
    });
  });

  describe('something unfinished that the new file replaces or closes (D-32)', () => {
    it('my own unfinished job: a notice, and the upload goes on without a question', async () => {
      server([
        aJob({
          uuid: 'mine',
          status: 'validated',
          fileName: 'old.csv',
          createdBy: { id: 1, name: 'Jane' }
        })
      ]);
      await mount();
      await chooseFile();
      expect(text()).toContain(
        'There is an unfinished products import (old.csv'
      );
      // The time in the notice is the store's, like the one in the list.
      expect(text()).toContain(`uploaded by Jane at ${storeTime}`);
      expect(text()).not.toContain(browserTime);
      await submit();
      expect(openAlert).not.toHaveBeenCalled();
      expect(uploads()).toHaveLength(1);
    });

    it('another admin’s: asks first, says who and which file, and sends nothing if the answer is no', async () => {
      server([
        aJob({
          uuid: 'theirs',
          status: 'validated',
          fileName: 'omar.csv',
          createdBy: { id: 2, name: 'Omar' }
        })
      ]);
      await mount();
      await chooseFile();
      await submit();
      expect(openAlert).toHaveBeenCalledTimes(1);
      expect(openAlert.mock.calls[0][0].heading).toBe(
        'Replace the earlier upload?'
      );
      expect(openAlert.mock.calls[0][0].content).toMatch(
        /^Omar uploaded omar\.csv at .+ Continue\?$/
      );
      // The time is the store's, as in the list.
      expect(openAlert.mock.calls[0][0].content).toContain(storeTime);
      expect(openAlert.mock.calls[0][0].content).not.toContain(browserTime);
      expect(uploads()).toHaveLength(0);
      await confirmWith(0, 'primaryAction');
      expect(closeAlert).toHaveBeenCalledTimes(1);
      expect(uploads()).toHaveLength(0);
      expect(button('Upload and validate')!.disabled).toBe(false);
    });

    it('another admin’s: still asks when the last look at the jobs fails, from what the page knew', async () => {
      const state = server([
        aJob({
          uuid: 'theirs',
          status: 'validated',
          createdBy: { id: 2, name: 'Omar' }
        })
      ]);
      await mount();
      await chooseFile();
      answers.unshift((r) =>
        r.method === 'GET' && r.url === PROPS.openUrl
          ? refused(500, 'X')
          : undefined
      );
      expect(state.open).toHaveLength(1);
      await submit();
      expect(openAlert).toHaveBeenCalledTimes(1);
      expect(uploads()).toHaveLength(0);
    });

    it('another admin’s: sends the file when the answer is yes', async () => {
      server([
        aJob({
          uuid: 'theirs',
          status: 'validated',
          createdBy: { id: 2, name: 'Omar' }
        })
      ]);
      await mount();
      await chooseFile();
      await submit();
      await confirmWith(0, 'secondaryAction');
      expect(uploads()).toHaveLength(1);
      expect(goTo).toHaveBeenCalledWith('/admin/import/new-job');
    });

    it('a stopped import that wrote rows: asks first, with the rows', async () => {
      server([
        aJob({
          uuid: 'stopped-1',
          status: 'stopped',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { created: 11990, failed: 10 }
        })
      ]);
      await mount();
      await chooseFile();
      await submit();
      expect(openAlert.mock.calls[0][0].heading).toBe(
        'Close the earlier import?'
      );
      expect(openAlert.mock.calls[0][0].content).toContain(
        'stopped after 12000 rows'
      );
      await confirmWith(0, 'secondaryAction');
      expect(uploads()).toHaveLength(1);
    });

    it('two things at once: asks about each, in turn, and stops at the first no', async () => {
      server([
        aJob({
          uuid: 'stopped-1',
          status: 'stopped',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { created: 5 }
        }),
        aJob({
          uuid: 'theirs',
          status: 'validated',
          createdBy: { id: 2, name: 'Omar' }
        })
      ]);
      await mount();
      await chooseFile();
      await submit();
      expect(openAlert).toHaveBeenCalledTimes(1);
      await confirmWith(0, 'secondaryAction');
      expect(openAlert).toHaveBeenCalledTimes(2);
      expect(uploads()).toHaveLength(0);
      await confirmWith(1, 'primaryAction');
      expect(uploads()).toHaveLength(0);
    });
  });
});
