import '../../../../../components/frontStore/customer/address/tests/unit/domSetup.js';
import { afterEach, describe, expect, it } from '@jest/globals';
import type {
  Http,
  HttpReply,
  HttpRequest,
  IssuesPage
} from '../../../ui/importApi.js';
import { settle } from '../helpers/fakeTab.js';

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { ProblemsTable } = await import('../../../components/ProblemsTable.js');
const { createImportApi } = await import('../../../ui/importApi.js');

/**
 * The table of problems (§ 8.2): the totals per type, the three filters and the
 * pages. The server is a function of the query, so each case sees what the page
 * asked for and answers with what such a query would give.
 */
const issue = (
  row: number,
  code = 'INVALID_VALUE',
  severity: 'error' | 'warning' = 'error'
) => ({
  row,
  key: `SKU-${row}`,
  column: 'price',
  code,
  severity,
  params: {},
  message: `Problem on row ${row}`,
  value: `v${row}`
});

const asked: HttpRequest[] = [];
let answer: (request: HttpRequest) => IssuesPage | HttpReply = () => page([]);
const page = (
  items: ReturnType<typeof issue>[],
  over: Partial<IssuesPage> = {}
): IssuesPage => ({
  phase: 'validate',
  page: 1,
  limit: 50,
  total: items.length,
  byCode: { INVALID_VALUE: 7, REFERENCE_NOT_FOUND: 3 },
  truncated: false,
  items,
  ...over
});
const http: Http = {
  async send(request) {
    asked.push(request);
    const result = answer(request);
    return 'status' in result
      ? result
      : { status: 200, headers: {}, data: { data: result } };
  }
};
const api = createImportApi(http, () => 0);

let container: HTMLElement;
let root: ReturnType<typeof createRoot>;
const mount = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<ProblemsTable api={api} issuesUrl="/api/issues" />);
    await settle();
  });
};
const text = () => container.textContent?.replace(/\s+/g, ' ') ?? '';
const last = () => asked[asked.length - 1].params;
const select = (label: string) =>
  container.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
const choose = (el: HTMLSelectElement, value: string) =>
  act(async () => {
    el.value = value;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
    await settle();
  });
const buttonWith = (label: string) =>
  [...container.querySelectorAll('button')].find(
    (b) => b.textContent === label
  ) as HTMLButtonElement;

describe('the table of problems', () => {
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    asked.length = 0;
    answer = () => page([]);
  });

  it('asks for the first page with no filter, and shows the rows with the messages of the server', async () => {
    answer = () =>
      page([issue(14), issue(20, 'REFERENCE_NOT_FOUND', 'warning')]);
    await mount();
    expect(last()).toEqual({ page: 1, limit: 50 });
    const t = text();
    expect(t).toContain('SKU-14');
    expect(t).toContain('Problem on row 14');
    expect(t).toContain('Problem on row 20');
    expect(t).toContain('v14');
  });

  it('lists the types with their totals, largest first', async () => {
    await mount();
    const t = text();
    expect(t).toContain('Problems by type:');
    expect(t.indexOf('INVALID_VALUE x7')).toBeGreaterThan(-1);
    expect(t.indexOf('INVALID_VALUE x7')).toBeLessThan(
      t.indexOf('REFERENCE_NOT_FOUND x3')
    );
  });

  it('filters by a type when it is clicked, and clears the filter when it is clicked again', async () => {
    await mount();
    await act(async () => {
      buttonWith('REFERENCE_NOT_FOUND x3').click();
      await settle();
    });
    expect(last()).toEqual({ code: 'REFERENCE_NOT_FOUND', page: 1, limit: 50 });
    expect(select('Type').value).toBe('REFERENCE_NOT_FOUND');
    await act(async () => {
      buttonWith('REFERENCE_NOT_FOUND x3').click();
      await settle();
    });
    expect(last()).toEqual({ page: 1, limit: 50 });
  });

  it('keeps the totals per type of the whole job while a filter is on', async () => {
    answer = (r) =>
      page([], {
        byCode: { INVALID_VALUE: 7, REFERENCE_NOT_FOUND: 3 },
        total: r.params?.code ? 3 : 10
      });
    await mount();
    await choose(select('Type'), 'REFERENCE_NOT_FOUND');
    expect(text()).toContain('INVALID_VALUE x7');
  });

  it('filters by severity', async () => {
    await mount();
    await choose(select('Severity'), 'warning');
    expect(last()).toEqual({ severity: 'warning', page: 1, limit: 50 });
  });

  it('filters by a column when the admin leaves the field, and not for every key typed', async () => {
    await mount();
    const input = container.querySelector(
      'input[aria-label="Column"]'
    ) as HTMLInputElement;
    const before = asked.length;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!;
      set.call(input, 'price');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await settle();
    });
    expect(asked).toHaveLength(before);
    await act(async () => {
      input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
      input.blur();
      await settle();
    });
    expect(last()).toEqual({ column: 'price', page: 1, limit: 50 });
  });

  it('filters by a column when Enter is pressed in the field', async () => {
    await mount();
    const input = container.querySelector(
      'input[aria-label="Column"]'
    ) as HTMLInputElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!;
      set.call(input, 'sku');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await settle();
    });
    await act(async () => {
      input.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      await settle();
    });
    expect(last()).toEqual({ column: 'sku', page: 1, limit: 50 });
  });

  it('does not ask again when the field is left with the same column', async () => {
    await mount();
    const input = container.querySelector(
      'input[aria-label="Column"]'
    ) as HTMLInputElement;
    const before = asked.length;
    await act(async () => {
      input.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
      await settle();
    });
    expect(asked).toHaveLength(before);
  });

  describe('pages', () => {
    const many = (n: number) =>
      Array.from({ length: 50 }, (_, i) => issue(n + i));

    it('shows no pager for one page', async () => {
      answer = () => page(many(1), { total: 50 });
      await mount();
      expect(text()).not.toContain('Page 1 of');
    });

    it('goes forward and back, one page at a time, and stops at the ends', async () => {
      answer = (r) =>
        page(many(Number(r.params?.page ?? 1) * 100), {
          total: 120,
          page: Number(r.params?.page ?? 1)
        });
      await mount();
      expect(text()).toContain('Page 1 of 3');
      expect(buttonWith('Previous').disabled).toBe(true);
      await act(async () => {
        buttonWith('Next').click();
        await settle();
      });
      expect(last()).toEqual({ page: 2, limit: 50 });
      expect(text()).toContain('Page 2 of 3');
      await act(async () => {
        buttonWith('Next').click();
        await settle();
      });
      expect(buttonWith('Next').disabled).toBe(true);
      await act(async () => {
        buttonWith('Previous').click();
        await settle();
      });
      expect(last()).toEqual({ page: 2, limit: 50 });
    });

    it('goes back to the first page when a filter changes', async () => {
      answer = (r) =>
        page(many(1), { total: 120, page: Number(r.params?.page ?? 1) });
      await mount();
      await act(async () => {
        buttonWith('Next').click();
        await settle();
      });
      await choose(select('Severity'), 'error');
      expect(last()).toEqual({ severity: 'error', page: 1, limit: 50 });
    });
  });

  it('says there is nothing to show, and that more problems exist than are listed', async () => {
    answer = () => page([], { truncated: true });
    await mount();
    expect(text()).toContain('There is no problem to display.');
    expect(text()).toContain('More problems exist than are listed.');
  });

  it('shows the message when the server refuses, keeps the rows it had, and drops the message at the next good answer', async () => {
    answer = () => page([issue(1)]);
    await mount();
    answer = () => ({
      status: 500,
      headers: {},
      data: { error: { status: 500, message: 'The request failed.' } }
    });
    await choose(select('Severity'), 'error');
    expect(text()).toContain('The request failed.');
    expect(text()).toContain('Problem on row 1');
    answer = () => page([issue(2)]);
    await choose(select('Severity'), 'warning');
    expect(text()).not.toContain('The request failed.');
    expect(text()).toContain('Problem on row 2');
  });

  it('never lets an older answer replace a newer one', async () => {
    const waiting: Array<(p: IssuesPage) => void> = [];
    const slow: Http = {
      send: (request) => {
        asked.push(request);
        return new Promise<HttpReply>((resolve) => {
          waiting.push((p) =>
            resolve({ status: 200, headers: {}, data: { data: p } })
          );
        });
      }
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const slowApi = createImportApi(slow, () => 0);
    await act(async () => {
      root.render(<ProblemsTable api={slowApi} issuesUrl="/api/issues" />);
      await settle();
    });
    // The admin changes a filter while the first answer is still on its way.
    await act(async () => {
      waiting[0](page([issue(9)]));
      await settle();
    });
    await choose(select('Severity'), 'error');
    await choose(select('Severity'), 'warning');
    expect(waiting).toHaveLength(3);
    expect(asked[1].signal?.aborted).toBe(true);
    expect(asked[2].signal?.aborted).toBe(false);
    await act(async () => {
      waiting[2](page([issue(2)]));
      await settle();
    });
    await act(async () => {
      waiting[1](page([issue(1)]));
      await settle();
    });
    expect(text()).toContain('Problem on row 2');
    expect(text()).not.toContain('Problem on row 1');
  });
});
