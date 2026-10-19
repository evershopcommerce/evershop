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
import { settle } from '../helpers/fakeTab.js';

/**
 * The list of past imports, whole: filters that go to an address, the choice of
 * rows, Delete with its question and the header, and the paging that the list
 * reports. The browser is jsdom; the network, the dialog, the toast and the
 * navigation are replaced.
 */
const sent: HttpRequest[] = [];
let answer: (request: HttpRequest) => HttpReply = () => ({
  status: 200,
  headers: {},
  data: { data: {} }
});
type Confirm = {
  heading: string;
  content: string;
  primaryAction: { onAction(): void };
  secondaryAction: { onAction(): void };
};
const openAlert = jest.fn<(config: Confirm) => void>();
const closeAlert = jest.fn();
const goTo = jest.fn();
const toastError = jest.fn();
const paging: Array<{ total: number; limit: number; page: number }> = [];

jest.unstable_mockModule('../../../ui/axiosHttp.js', () => ({
  axiosHttp: {
    send: async (request: HttpRequest): Promise<HttpReply> => {
      sent.push(request);
      return answer(request);
    }
  }
}));
jest.unstable_mockModule('../../../ui/navigate.js', () => ({ goTo }));
jest.unstable_mockModule('@components/common/modal/Alert.js', () => ({
  useAlertContext: () => ({ openAlert, closeAlert })
}));
jest.unstable_mockModule('@components/common/ui/Sonner.js', () => ({
  toast: { error: toastError, success: jest.fn() }
}));
jest.unstable_mockModule('@components/admin/grid/GridPagination.js', () => ({
  GridPagination: (props: { total: number; limit: number; page: number }) => {
    paging.push(props);
    return null;
  }
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: ImportGrid } = await import(
  '../../../pages/admin/importGrid/Grid.js'
);

const row = (n: number, over: Record<string, unknown> = {}) => ({
  uuid: `job-${n}`,
  entity: 'product',
  mode: 'upsert',
  status: 'completed',
  fileName: `file-${n}.csv`,
  counts: { total: 10, created: 10, updated: 0, failed: 0 },
  createdByName: 'Jane',
  createdAt: { text: '2026-10-13 15:02' },
  viewUrl: `/admin/import/job-${n}`,
  active: false,
  deleteApi: `/api/import-jobs/job-${n}`,
  ...over
});
const list = (
  items: unknown[],
  currentFilters: unknown[] = [],
  total = items.length
) => ({
  importJobs: { items, total, currentFilters }
});

let container: HTMLElement;
let root: ReturnType<typeof createRoot>;
const mount = async (props: unknown) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <ImportGrid {...(props as React.ComponentProps<typeof ImportGrid>)} />
    );
    await settle();
  });
};
const text = () => container.textContent?.replace(/\s+/g, ' ') ?? '';
const box = (label: string) =>
  container.querySelector(`[aria-label="${label}"]`) as HTMLElement;
const click = (el: Element | null) =>
  act(async () => {
    (el as HTMLElement).click();
    await settle();
  });
const button = (label: string) =>
  [...container.querySelectorAll('button')].find(
    (b) => b.textContent === label
  );
const change = (el: HTMLSelectElement, value: string) =>
  act(async () => {
    el.value = value;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
  });

describe('the list of past imports (jsdom)', () => {
  beforeEach(() => {
    sent.length = 0;
    paging.length = 0;
    openAlert.mockClear();
    closeAlert.mockClear();
    goTo.mockClear();
    toastError.mockClear();
    answer = () => ({ status: 200, headers: {}, data: { data: {} } });
    window.history.pushState({}, '', '/admin/import');
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows the imports, each file a link to its page', async () => {
    await mount(list([row(1), row(2)]));
    expect(text()).toContain('file-1.csv');
    expect(text()).toContain('file-2.csv');
    expect(
      container.querySelector('a[href="/admin/import/job-2"]')
    ).not.toBeNull();
  });

  it('shows the empty list when there is none, or when the field is not for this user', async () => {
    await mount({ importJobs: null });
    expect(text()).toContain('No import yet.');
  });

  describe('paging', () => {
    it('gives the pager the total, 20 a page and page 1 unless the list says otherwise', async () => {
      await mount(list([row(1)], [], 57));
      expect(paging.at(-1)).toEqual({ total: 57, limit: 20, page: 1 });
    });

    it('gives it the page and the limit that the list applied', async () => {
      await mount(
        list(
          [row(1)],
          [
            { key: 'page', operation: 'eq', value: '3' },
            { key: 'limit', operation: 'eq', value: '50' }
          ],
          200
        )
      );
      expect(paging.at(-1)).toEqual({ total: 200, limit: 50, page: 3 });
    });
  });

  describe('the filters', () => {
    it('go to the address with the status chosen', async () => {
      await mount(list([row(1)]));
      await change(box('Status') as HTMLSelectElement, 'stopped');
      expect(goTo).toHaveBeenCalledWith(
        'http://localhost/admin/import?status=stopped'
      );
    });

    it('go to the address with the type chosen, and keep the rest', async () => {
      window.history.pushState(
        {},
        '',
        '/admin/import?status=failed&page=2&ob=status&od=asc'
      );
      await mount(
        list([row(1)], [{ key: 'status', operation: 'eq', value: 'failed' }])
      );
      await change(box('Type') as HTMLSelectElement, 'customer');
      const url = new URL(goTo.mock.calls[0][0] as string);
      expect(url.searchParams.get('status')).toBe('failed');
      expect(url.searchParams.get('entity')).toBe('customer');
      expect(url.searchParams.get('ob')).toBe('status');
      expect(url.searchParams.has('page')).toBe(false);
    });

    it('search by file name when Enter is pressed, not for every key', async () => {
      await mount(list([row(1)]));
      const input = box('Search') as HTMLInputElement;
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )!.set!.call(input, 'spring');
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
        await settle();
      });
      expect(goTo).not.toHaveBeenCalled();
      // a key that is not Enter does not search
      await act(async () => {
        input.dispatchEvent(
          new window.KeyboardEvent('keydown', { key: 'a', bubbles: true })
        );
        await settle();
      });
      expect(goTo).not.toHaveBeenCalled();
      await act(async () => {
        input.dispatchEvent(
          new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
        await settle();
      });
      const url = new URL(goTo.mock.calls[0][0] as string);
      expect(url.searchParams.get('file[operation]')).toBe('like');
      expect(url.searchParams.get('file[value]')).toBe('spring');
    });

    it('show what the list applied', async () => {
      await mount(
        list(
          [row(1)],
          [
            { key: 'status', operation: 'eq', value: 'stopped' },
            { key: 'file', operation: 'like', value: 'spring' }
          ]
        )
      );
      expect((box('Status') as HTMLSelectElement).value).toBe('stopped');
      expect((box('Search') as HTMLInputElement).value).toBe('spring');
    });

    it('are cleared by Clear filter, with the order and the page', async () => {
      window.history.pushState(
        {},
        '',
        '/admin/import?status=failed&ob=status&page=3'
      );
      await mount(list([row(1)]));
      await click(button('Clear filter') as Element);
      expect(goTo).toHaveBeenCalledWith('http://localhost/admin/import');
    });
  });

  describe('Delete', () => {
    it('is offered when rows are chosen, asks first, and does nothing if the answer is no', async () => {
      await mount(list([row(1), row(2)]));
      expect(button('Delete')).toBeUndefined();
      await click(box('Select file-1.csv'));
      await click(button('Delete') as Element);
      expect(openAlert).toHaveBeenCalledTimes(1);
      expect(openAlert.mock.calls[0][0].heading).toBe(
        'Delete the selected imports?'
      );
      expect(openAlert.mock.calls[0][0].content).toContain(
        'The rows already imported stay in the store.'
      );
      await act(async () => {
        openAlert.mock.calls[0][0].primaryAction.onAction();
        await settle();
      });
      expect(sent).toHaveLength(0);
    });

    it('deletes each chosen import with the header, then shows the list again', async () => {
      await mount(list([row(1), row(2), row(3)]));
      await click(box('Select file-1.csv'));
      await click(box('Select file-3.csv'));
      await click(button('Delete') as Element);
      await act(async () => {
        openAlert.mock.calls[0][0].secondaryAction.onAction();
        await settle();
      });
      expect(closeAlert).toHaveBeenCalledTimes(1);
      expect(sent.map((r) => [r.method, r.url, r.headers])).toEqual([
        ['DELETE', '/api/import-jobs/job-1', { 'X-Import-Request': '1' }],
        ['DELETE', '/api/import-jobs/job-3', { 'X-Import-Request': '1' }]
      ]);
      expect(toastError).not.toHaveBeenCalled();
      expect(goTo).toHaveBeenCalledWith('http://localhost/admin/import');
    });

    it('says how many could not be deleted, because they started meanwhile, and still shows the list again', async () => {
      answer = (r) =>
        r.url.endsWith('job-2')
          ? {
              status: 409,
              headers: {},
              data: {
                error: { status: 409, code: 'WRONG_STATUS', message: 'x' }
              }
            }
          : { status: 200, headers: {}, data: { data: {} } };
      await mount(list([row(1), row(2)]));
      await click(box('Select all'));
      await click(button('Delete') as Element);
      await act(async () => {
        openAlert.mock.calls[0][0].secondaryAction.onAction();
        await settle();
      });
      expect(toastError).toHaveBeenCalledWith(
        '1 imports could not be deleted. They may have started.'
      );
      expect(goTo).toHaveBeenCalled();
    });

    it('cannot choose a job at work, and Select all leaves it out', async () => {
      await mount(list([row(1), row(2, { active: true, status: 'running' })]));
      expect(
        (box('Select file-2.csv') as HTMLButtonElement).hasAttribute(
          'disabled'
        ) || box('Select file-2.csv').getAttribute('aria-disabled') === 'true'
      ).toBe(true);
      await click(box('Select all'));
      await click(button('Delete') as Element);
      await act(async () => {
        openAlert.mock.calls[0][0].secondaryAction.onAction();
        await settle();
      });
      expect(sent.map((r) => r.url)).toEqual(['/api/import-jobs/job-1']);
    });
  });
});
