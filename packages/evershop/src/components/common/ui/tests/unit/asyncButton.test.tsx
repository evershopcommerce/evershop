import '../../../../frontStore/customer/address/tests/unit/domSetup.js';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Loading state of buttons whose click waits on the server: `AsyncButton`
 * (and the `useAsyncAction` hook behind it), the legacy `openAlert` dialog's
 * action buttons, and `SubmitButton` for a `<Form submitBtn={false}>`. On a
 * slow network a button that looks idle after a click invites a second click,
 * so each shows a spinner until its work ends, and keeps it while the page
 * reloads after a success.
 */
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { AsyncButton } = await import('../../AsyncButton.js');
const { useAsyncAction } = await import('../../hooks/useAsyncAction.js');
const { Alert, useAlertContext } = await import('../../../modal/Alert.js');
const { Form } = await import('../../../form/Form.js');
const { SubmitButton } = await import('../../../form/SubmitButton.js');

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (e: Error) => void;
};
const deferred = (): Deferred => {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

let container: HTMLElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;
const mount = async (element: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(element);
  });
};
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

const button = (label: string) =>
  [...document.querySelectorAll('button')].find(
    (b) => b.textContent === label || b.getAttribute('aria-label') === label
  ) as HTMLButtonElement | undefined;
/** The button that shows the spinner (it replaces the label). */
const spinningButton = () =>
  document.querySelector('button [role="status"]')?.closest('button') ?? null;
const click = (el: Element | null | undefined) =>
  act(async () => {
    (el as HTMLElement).click();
  });
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
/** What a browser does inside `location.reload()` / `location.href = …`. */
const startLeaving = () => window.dispatchEvent(new window.Event('beforeunload'));
const restoreFromCache = () => {
  const event = new window.Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  window.dispatchEvent(event);
};

describe('AsyncButton', () => {
  it('shows a spinner and ignores clicks until the promise settles', async () => {
    const work = deferred();
    const onClick = jest.fn(() => work.promise);
    await mount(<AsyncButton onClick={onClick}>Save</AsyncButton>);

    await click(button('Save'));
    const busy = spinningButton();
    expect(busy).not.toBeNull();
    expect(busy!.disabled).toBe(true);
    await click(busy);
    expect(onClick).toHaveBeenCalledTimes(1);

    work.resolve();
    await flush();
    expect(spinningButton()).toBeNull();
    expect(button('Save')!.disabled).toBe(false);
  });

  it('shows no spinner for a click handler that returns nothing', async () => {
    const onClick = jest.fn(() => undefined);
    await mount(<AsyncButton onClick={onClick}>Open</AsyncButton>);
    await click(button('Open'));
    await click(button('Open'));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(spinningButton()).toBeNull();
  });

  it('keeps the spinner while the page reloads after a success', async () => {
    await mount(
      <AsyncButton
        onClick={async () => {
          await Promise.resolve();
          startLeaving();
        }}
      >
        Delete
      </AsyncButton>
    );
    await click(button('Delete'));
    await flush();
    expect(spinningButton()).not.toBeNull();

    // Back button: the page comes back from the back/forward cache idle.
    await act(async () => restoreFromCache());
    expect(spinningButton()).toBeNull();
    expect(button('Delete')!.disabled).toBe(false);
  });

  it('stops the spinner when a navigation is cancelled later', async () => {
    // A "leave the page?" prompt answered "stay": `beforeunload` fired, no
    // navigation followed. The next action must not think the page leaves.
    startLeaving();
    await flush();
    const work = deferred();
    await mount(<AsyncButton onClick={() => work.promise}>Save</AsyncButton>);
    await click(button('Save'));
    work.resolve();
    await flush();
    expect(spinningButton()).toBeNull();
  });

  it('keeps each button of a list on its own state', async () => {
    const first = deferred();
    await mount(
      <div>
        <AsyncButton onClick={() => first.promise}>Row 1</AsyncButton>
        <AsyncButton onClick={() => undefined}>Row 2</AsyncButton>
      </div>
    );
    await click(button('Row 1'));
    expect(button('Row 2')!.disabled).toBe(false);
    first.resolve();
    await flush();
  });
});

describe('useAsyncAction', () => {
  it('ends the loading state when the action fails, and logs the error', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    let run!: () => Promise<void>;
    let running = false;
    function Probe() {
      const [r, busy] = useAsyncAction(async () => {
        throw new Error('refused');
      });
      run = r;
      running = busy;
      return null;
    }
    await mount(<Probe />);
    await act(async () => {
      await run();
    });
    expect((logged.mock.calls[0][0] as Error).message).toBe('refused');
    expect(running).toBe(false);
    logged.mockRestore();
  });
});

describe('openAlert action buttons', () => {
  function Opener({ onAction }: { onAction: () => unknown }) {
    const { openAlert, closeAlert } = useAlertContext();
    return (
      <button
        type="button"
        onClick={() =>
          openAlert({
            heading: 'Delete 2 products',
            content: 'Are you sure?',
            primaryAction: {
              title: 'Cancel',
              onAction: closeAlert,
              variant: 'secondary'
            },
            secondaryAction: {
              title: 'Delete',
              onAction,
              variant: 'destructive',
              // What the grids pass: a value read when the alert opened.
              isLoading: false
            }
          })
        }
      >
        Open
      </button>
    );
  }

  it('shows a spinner on the action whose onAction returns a promise', async () => {
    // The grids' bulk actions catch nothing: a failed request rejects.
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const work = deferred();
    const onAction = jest.fn(() => work.promise);
    await mount(
      <Alert>
        <Opener onAction={onAction} />
      </Alert>
    );
    await click(button('Open'));
    await click(button('Delete'));
    expect(spinningButton()).not.toBeNull();
    expect(button('Cancel')!.disabled).toBe(false);
    await click(spinningButton());
    expect(onAction).toHaveBeenCalledTimes(1);

    work.reject(new Error('offline'));
    await flush();
    expect(spinningButton()).toBeNull();
    expect(button('Delete')!.disabled).toBe(false);
    expect((logged.mock.calls[0][0] as Error).message).toBe('offline');
    logged.mockRestore();
  });

  it('keeps the spinner while the page reloads after the action', async () => {
    await mount(
      <Alert>
        <Opener
          onAction={async () => {
            await Promise.resolve();
            startLeaving();
          }}
        />
      </Alert>
    );
    await click(button('Open'));
    await click(button('Delete'));
    await flush();
    expect(spinningButton()).not.toBeNull();
    await act(async () => restoreFromCache());
  });
});

describe('SubmitButton', () => {
  it('shows a spinner while the form submits, then goes idle', async () => {
    const work = deferred();
    await mount(
      <Form id="f" onSubmit={() => work.promise} submitBtn={false}>
        <SubmitButton>Save Settings</SubmitButton>
      </Form>
    );
    await click(button('Save Settings'));
    expect(spinningButton()).not.toBeNull();
    work.resolve();
    await flush();
    expect(spinningButton()).toBeNull();
  });

  it('keeps the spinner when the save redirects, as the Form button does', async () => {
    await mount(
      <Form
        id="g"
        onSubmit={async () => {
          await Promise.resolve();
          startLeaving();
        }}
      >
        <SubmitButton>Create</SubmitButton>
      </Form>
    );
    await click(button('Create'));
    await flush();
    // Both the page's own save button and the Form's default one spin.
    const spinners = document.querySelectorAll('button [role="status"]');
    expect(spinners).toHaveLength(2);
    await act(async () => restoreFromCache());
    expect(document.querySelectorAll('button [role="status"]')).toHaveLength(0);
  });
});
